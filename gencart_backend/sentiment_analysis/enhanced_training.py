"""
Enhanced training service with class balancing and validation split
"""
from django.conf import settings
from django.db import transaction
from django.db import models
from typing import Dict, List, Optional, Tuple
import logging
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.utils.class_weight import compute_class_weight
from imblearn.over_sampling import SMOTE
from imblearn.under_sampling import RandomUnderSampler
from collections import Counter

from products.models import Review
from .models import (
    SentimentAnalysisSystem,
    BERTSentimentAnalyzer,
    NaiveBayesSentimentAnalyzer
)

logger = logging.getLogger(__name__)

class EnhancedModelTrainingService:
    """Enhanced training service with balancing and validation"""
    
    def __init__(self, language='en'):
        self.language = language
    
    def prepare_training_data_enhanced(self, 
                                     use_validation: bool = True,
                                     validation_size: float = 0.15,
                                     test_size: float = 0.15,
                                     balance_classes: bool = False,
                                     balance_method: str = 'smote') -> Dict:
        """
        Enhanced data preparation with validation split and class balancing
        
        Args:
            use_validation: Whether to create validation set (70/15/15 split)
            validation_size: Validation set proportion
            test_size: Test set proportion  
            balance_classes: Whether to balance class distribution
            balance_method: 'smote', 'undersample', or 'class_weights'
        """
        reviews = Review.objects.filter(
            sentiment__isnull=False,
            rating__isnull=False
        ).values('title', 'comment', 'sentiment', 'rating')
        
        texts, labels = [], []
        mapping = {'negative': 0, 'neutral': 1, 'positive': 2}
        
        for r in reviews:
            text = f"{r['title'] or ''} {r['comment'] or ''}".strip()
            if not text or len(text) < 3:  # Filter very short texts
                continue
            texts.append(text)
            labels.append(mapping.get(r['sentiment'], 1))
        
        if len(texts) < 10:
            logger.warning("Insufficient data for enhanced splitting")
            return self._simple_split(texts, labels)
        
        # Initial split
        if use_validation:
            # First split: train+val vs test
            X_temp, X_test, y_temp, y_test = train_test_split(
                texts, labels, test_size=test_size, random_state=42, stratify=labels
            )
            
            # Second split: train vs validation  
            val_size_adjusted = validation_size / (1 - test_size)
            X_train, X_val, y_train, y_val = train_test_split(
                X_temp, y_temp, test_size=val_size_adjusted, random_state=42, stratify=y_temp
            )
            
            splits = {
                'X_train': X_train, 'y_train': y_train,
                'X_val': X_val, 'y_val': y_val,
                'X_test': X_test, 'y_test': y_test
            }
        else:
            # Simple train/test split
            X_train, X_test, y_train, y_test = train_test_split(
                texts, labels, test_size=test_size + validation_size, 
                random_state=42, stratify=labels
            )
            splits = {
                'X_train': X_train, 'y_train': y_train,
                'X_test': X_test, 'y_test': y_test
            }
        
        # Class balancing
        if balance_classes and len(X_train) > 50:
            try:
                splits = self._balance_classes(splits, balance_method)
                logger.info(f"Applied class balancing using {balance_method}")
            except Exception as e:
                logger.warning(f"Class balancing failed: {e}, proceeding without balancing")
        
        # Add metadata
        splits['metadata'] = {
            'total_samples': len(texts),
            'original_distribution': Counter(labels),
            'train_distribution': Counter(splits['y_train']),
            'use_validation': use_validation,
            'balance_method': balance_method if balance_classes else None
        }
        
        return splits
    
    def _balance_classes(self, splits: Dict, method: str) -> Dict:
        """Apply class balancing to training data"""
        X_train, y_train = splits['X_train'], splits['y_train']
        
        # Convert to numpy for sklearn compatibility
        X_train_array = np.array(X_train)
        y_train_array = np.array(y_train)
        
        if method == 'smote':
            # SMOTE requires numerical features - use simple oversampling instead
            from imblearn.over_sampling import RandomOverSampler
            ros = RandomOverSampler(random_state=42)
            X_balanced, y_balanced = ros.fit_resample(
                X_train_array.reshape(-1, 1), y_train_array
            )
            X_train_balanced = X_balanced.flatten().tolist()
            y_train_balanced = y_balanced.tolist()
            
        elif method == 'undersample':
            rus = RandomUnderSampler(random_state=42)
            X_balanced, y_balanced = rus.fit_resample(
                X_train_array.reshape(-1, 1), y_train_array
            )
            X_train_balanced = X_balanced.flatten().tolist()
            y_train_balanced = y_balanced.tolist()
            
        elif method == 'class_weights':
            # For class weights, don't modify data, just compute weights
            class_weights = compute_class_weight(
                'balanced', classes=np.unique(y_train_array), y=y_train_array
            )
            splits['class_weights'] = dict(zip(np.unique(y_train_array), class_weights))
            return splits
        
        else:
            raise ValueError(f"Unknown balance method: {method}")
        
        # Update splits with balanced data
        splits['X_train'] = X_train_balanced
        splits['y_train'] = y_train_balanced
        splits['balanced'] = True
        
        return splits
    
    def _simple_split(self, texts: List[str], labels: List[int]) -> Dict:
        """Fallback for small datasets"""
        if len(texts) < 4:
            return {
                'X_train': texts, 'y_train': labels,
                'X_test': texts, 'y_test': labels,
                'metadata': {'total_samples': len(texts), 'note': 'Dataset too small for splitting'}
            }
        
        X_train, X_test, y_train, y_test = train_test_split(
            texts, labels, test_size=0.2, random_state=42
        )
        
        return {
            'X_train': X_train, 'y_train': y_train,
            'X_test': X_test, 'y_test': y_test,
            'metadata': {'total_samples': len(texts)}
        }
    
    def train_with_validation(self, algorithm: str = 'naive_bayes', **kwargs) -> Dict:
        """Train model with validation and return comprehensive results"""
        # Get enhanced training data
        data_splits = self.prepare_training_data_enhanced(
            use_validation=True,
            balance_classes=kwargs.get('balance_classes', False),
            balance_method=kwargs.get('balance_method', 'smote')
        )
        
        if algorithm == 'naive_bayes':
            analyzer = NaiveBayesSentimentAnalyzer(self.language)
            
            # Train model
            accuracy = analyzer.train(
                data_splits['X_train'], 
                data_splits['y_train'],
                test_size=0.0  # Don't split again, use our validation set
            )
            
            # Validate if validation set exists
            if 'X_val' in data_splits:
                val_results = self._evaluate_on_validation(
                    analyzer, data_splits['X_val'], data_splits['y_val']
                )
            else:
                val_results = {'accuracy': accuracy}
            
            # Save model
            analyzer.save_model()
            
            return {
                'algorithm': algorithm,
                'train_accuracy': accuracy,
                'validation_results': val_results,
                'data_info': data_splits['metadata'],
                'model': analyzer
            }
        
        else:
            raise ValueError(f"Algorithm {algorithm} not implemented for enhanced training")
    
    def _evaluate_on_validation(self, model, X_val: List[str], y_val: List[int]) -> Dict:
        """Evaluate model on validation set"""
        predictions = []
        confidences = []
        
        for text in X_val:
            try:
                result = model.predict(text)
                pred_label = {'negative': 0, 'neutral': 1, 'positive': 2}.get(
                    result['sentiment'], 1
                )
                predictions.append(pred_label)
                confidences.append(result.get('confidence', 0.0))
            except Exception as e:
                logger.warning(f"Prediction failed for text: {e}")
                predictions.append(1)  # Default to neutral
                confidences.append(0.0)
        
        # Calculate metrics
        correct = sum(1 for p, t in zip(predictions, y_val) if p == t)
        accuracy = correct / len(y_val) if y_val else 0.0
        avg_confidence = np.mean(confidences) if confidences else 0.0
        
        return {
            'accuracy': accuracy,
            'avg_confidence': avg_confidence,
            'predictions': predictions,
            'actual': y_val
        }