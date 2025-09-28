import os
import pickle
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
import logging

# NLP Libraries
import nltk
from textblob import TextBlob
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import joblib

# (Removed TensorFlow/LSTM placeholder; current system does not implement LSTM)

# Optional Transformer Libraries
try:
    from transformers import AutoTokenizer, AutoModelForSequenceClassification, pipeline
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    print("Transformers library not available. BERT models will use TextBlob fallback.")

# Vietnamese NLP
try:
    from underthesea import word_tokenize, pos_tag
    from pyvi import ViTokenizer
    VIETNAMESE_SUPPORT = True
except ImportError:
    VIETNAMESE_SUPPORT = False
    print("Vietnamese NLP libraries not installed. Using English-only models.")

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SentimentPreprocessor:
    """Text preprocessing for sentiment analysis"""
    
    def __init__(self, language='en'):
        self.language = language
        self._download_nltk_data()
        self._load_vietnamese_stopwords()
    
    def _download_nltk_data(self):
        """Download required NLTK data"""
        try:
            nltk.download('punkt', quiet=True)
            nltk.download('stopwords', quiet=True)
            nltk.download('vader_lexicon', quiet=True)
        except:
            pass
    
    def _load_vietnamese_stopwords(self):
        """Load Vietnamese stopwords"""
        try:
            from .vietnamese_utils import get_vietnamese_stopwords
            self.vietnamese_stopwords = get_vietnamese_stopwords()
        except ImportError:
            # Fallback stopwords if utils not available
            self.vietnamese_stopwords = {
                'và', 'của', 'các', 'có', 'được', 'này', 'đó', 'cho', 'với', 'từ', 
                'trong', 'một', 'là', 'để', 'không', 'tôi', 'bạn', 'anh', 'chị', 'em', 
                'mình', 'rất', 'lắm', 'nhiều', 'ít', 'thì', 'sẽ', 'đã', 'đang'
            }
    
    def clean_text(self, text: str) -> str:
        """Clean and preprocess text"""
        if not text:
            return ""
        
        # Convert to lowercase
        text = text.lower()
        
        # Remove special characters but keep Vietnamese characters
        import re
        if self.language == 'vi':
            text = re.sub(r'[^\w\sàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]', ' ', text)
        else:
            text = re.sub(r'[^\w\s]', ' ', text)
        
        # Remove extra whitespace
        text = ' '.join(text.split())
        
        return text
    
    def remove_stopwords(self, text: str) -> str:
        """Remove stopwords while preserving sentiment words"""
        if not text:
            return ""
        
        tokens = text.split()
        
        if self.language == 'vi':
            # Remove Vietnamese stopwords
            filtered_tokens = [token for token in tokens 
                             if token not in self.vietnamese_stopwords and len(token) > 2]
        else:
            # Remove English stopwords
            try:
                from nltk.corpus import stopwords
                english_stopwords = set(stopwords.words('english'))
                filtered_tokens = [token for token in tokens 
                                 if token not in english_stopwords and len(token) > 2]
            except:
                # Fallback - just remove very short tokens
                filtered_tokens = [token for token in tokens if len(token) > 2]
        
        return ' '.join(filtered_tokens)
    
    def tokenize_vietnamese(self, text: str) -> List[str]:
        """Tokenize Vietnamese text"""
        if not VIETNAMESE_SUPPORT:
            return text.split()
        
        try:
            # Use underthesea for word segmentation
            tokens = word_tokenize(text)
            return tokens
        except:
            # Fallback to pyvi
            try:
                tokens = ViTokenizer.tokenize(text).split()
                return tokens
            except:
                return text.split()
    
    def preprocess(self, text: str) -> str:
        """Main preprocessing function"""
        text = self.clean_text(text)
        
        if self.language == 'vi':
            tokens = self.tokenize_vietnamese(text)
            return ' '.join(tokens)
        
        return text


class NaiveBayesSentimentAnalyzer:
    """Naive Bayes sentiment analysis model"""
    
    def __init__(self, language='en'):
        self.language = language
        self.preprocessor = SentimentPreprocessor(language)
        # Configure TF-IDF per documented defaults
        self.vectorizer = TfidfVectorizer(
            max_features=5000,
            stop_words='english' if language == 'en' else None,
            ngram_range=(1, 2),
            min_df=2,
            max_df=0.95,
        )
        self.model = MultinomialNB()
        self.is_trained = False
        # Canonical model directory: top-level /sentiment_models (repo root)
        # Fallbacks: app-local gencart_backend/sentiment_models and legacy non-suffixed files
        from pathlib import Path
        suffix = 'en' if language == 'en' else 'vi'
        # repo root = three levels up from this file: gencart_backend/sentiment_analysis/models.py
        repo_root = Path(__file__).resolve().parents[2]
        root_models_dir = repo_root / 'sentiment_models'
        app_models_dir = Path(__file__).resolve().parents[1] / 'sentiment_models'
        # ensure canonical dir exists for saves
        root_models_dir.mkdir(parents=True, exist_ok=True)
        self._paths = {
            'canonical_model': root_models_dir / f"naive_bayes_sentiment_{suffix}.pkl",
            'canonical_vec': root_models_dir / f"vectorizer_sentiment_{suffix}.pkl",
            'app_model': app_models_dir / f"naive_bayes_sentiment_{suffix}.pkl",
            'app_vec': app_models_dir / f"vectorizer_sentiment_{suffix}.pkl",
            'legacy_model': root_models_dir / 'naive_bayes_sentiment.pkl',
            'legacy_vec': root_models_dir / 'vectorizer_sentiment.pkl',
            'legacy_app_model': app_models_dir / 'naive_bayes_sentiment.pkl',
            'legacy_app_vec': app_models_dir / 'vectorizer_sentiment.pkl',
        }
        self.model_path = str(self._paths['canonical_model'])
        self.vectorizer_path = str(self._paths['canonical_vec'])
    
    def prepare_data(self, texts: List[str], labels: List[int]) -> Tuple[np.ndarray, np.ndarray]:
        """Prepare data for training"""
        # Preprocess texts
        processed_texts = [self.preprocessor.preprocess(text) for text in texts]
        
        # Vectorize
        X = self.vectorizer.fit_transform(processed_texts)
        y = np.array(labels)
        
        return X, y
    
    def train(self, texts: List[str], labels: List[int], test_size=0.2):
        """Train the Naive Bayes model"""
        logger.info("Training Naive Bayes model...")
        
        # Prepare data
        X, y = self.prepare_data(texts, labels)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=test_size, random_state=42)
        
        # Train model
        self.model.fit(X_train, y_train)
        
        # Evaluate
        y_pred = self.model.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        
        logger.info(f"Naive Bayes Accuracy: {accuracy:.4f}")
        logger.info(f"Classification Report:\n{classification_report(y_test, y_pred)}")
        
        self.is_trained = True
        return accuracy
    
    def train_with_validation(self, X_train, y_train, X_val=None, y_val=None):
        """Enhanced training with validation set"""
        from sklearn.metrics import precision_recall_fscore_support
        
        logger.info("Training Naive Bayes with validation...")
        
        # Configure vectorizer for better performance
        self.vectorizer = TfidfVectorizer(
            max_features=5000,
            stop_words='english' if self.language == 'en' else None,
            ngram_range=(1, 2),
            min_df=2,
            max_df=0.95
        )
        
        # Handle text preprocessing if needed
        if isinstance(X_train[0], str):
            # Preprocess texts
            X_train_processed = [self.preprocessor.preprocess(text) for text in X_train]
            X_train_vec = self.vectorizer.fit_transform(X_train_processed)
        else:
            # Already vectorized
            X_train_vec = X_train
        
        # Train model
        self.model = MultinomialNB()
        self.model.fit(X_train_vec, y_train)
        
        # Validation evaluation
        results = {'training_completed': True}
        
        if X_val is not None and y_val is not None:
            # Preprocess validation texts if needed
            if isinstance(X_val[0], str):
                X_val_processed = [self.preprocessor.preprocess(text) for text in X_val]
                X_val_vec = self.vectorizer.transform(X_val_processed)
            else:
                X_val_vec = X_val
                
            val_accuracy = self.model.score(X_val_vec, y_val)
            
            # Detailed validation metrics
            val_predictions = self.model.predict(X_val_vec)
            precision, recall, f1, _ = precision_recall_fscore_support(
                y_val, val_predictions, average='weighted'
            )
            
            results.update({
                'accuracy': val_accuracy,
                'precision': precision,
                'recall': recall,
                'f1_score': f1
            })
            
            logger.info(f"Validation Accuracy: {val_accuracy:.4f}")
            logger.info(f"Validation F1-Score: {f1:.4f}")
        
        self.is_trained = True
        return results
    
    def predict(self, text: str) -> Dict[str, float]:
        """Predict sentiment for a single text"""
        if not self.is_trained:
            self.load_model()
        
        if not self.is_trained:
            logger.error("Model not loaded. Cannot make predictions.")
            return {'sentiment': 'neutral', 'confidence': 0.0, 'probabilities': {'negative': 0.33, 'neutral': 0.34, 'positive': 0.33}}
        
        processed_text = self.preprocessor.preprocess(text)
        X = self.vectorizer.transform([processed_text])
        
        # Get prediction probabilities
        probabilities = self.model.predict_proba(X)[0]
        raw_prediction = self.model.predict(X)[0]
        
        # Get class names from the model
        classes = list(self.model.classes_)
        
        # Helper to map class label to sentiment string
        def to_sentiment(cls_val):
            # Numeric binary {0,1}
            if set(classes) == {0, 1}:
                return 'positive' if cls_val == 1 else 'negative'
            # Numeric ternary {0,1,2}
            if set(classes) == {0, 1, 2}:
                return {0: 'negative', 1: 'neutral', 2: 'positive'}.get(cls_val, str(cls_val))
            # String labels
            label = str(cls_val).lower()
            if label in {'pos', 'positive', '1'}:
                return 'positive'
            if label in {'neg', 'negative', '0'}:
                return 'negative'
            if label in {'neu', 'neutral', '2'}:
                return 'neutral'
            return label
        
        # Create probability mapping normalized to standard keys
        prob_dict = {'negative': 0.0, 'neutral': 0.0, 'positive': 0.0}
        for i, cls in enumerate(classes):
            mapped = to_sentiment(cls)
            prob_dict[mapped] = float(probabilities[i])
        
        sentiment = to_sentiment(raw_prediction)
        confidence = float(max(probabilities))
        
        return {
            'sentiment': sentiment,
            'confidence': confidence,
            'probabilities': prob_dict
        }
    
    def save_model(self):
        """Save the trained model"""
        os.makedirs('sentiment_models', exist_ok=True)
        joblib.dump(self.model, self.model_path)
        joblib.dump(self.vectorizer, self.vectorizer_path)
        logger.info(f"Model saved to {self.model_path}")
    
    def load_model(self):
        """Load a pre-trained model"""
        try:
            # Try canonical language-specific files first
            if os.path.exists(self.model_path) and os.path.exists(self.vectorizer_path):
                self.model = joblib.load(self.model_path)
                self.vectorizer = joblib.load(self.vectorizer_path)
                self.is_trained = True
                logger.info(f"Model loaded from {self.model_path}")
                return

            # Fallbacks: app-local language-specific
            app_model = str(self._paths['app_model'])
            app_vec = str(self._paths['app_vec'])
            if os.path.exists(app_model) and os.path.exists(app_vec):
                self.model = joblib.load(app_model)
                self.vectorizer = joblib.load(app_vec)
                self.is_trained = True
                logger.info(f"Model loaded from {app_model}")
                return

            # Legacy non-language-specific (root then app)
            for m_key, v_key in (
                ('legacy_model', 'legacy_vec'),
                ('legacy_app_model', 'legacy_app_vec'),
            ):
                m_path = str(self._paths[m_key])
                v_path = str(self._paths[v_key])
                if os.path.exists(m_path) and os.path.exists(v_path):
                    self.model = joblib.load(m_path)
                    self.vectorizer = joblib.load(v_path)
                    self.is_trained = True
                    logger.info(f"Loaded legacy sentiment model files: {m_path}")
                    return

            logger.warning("No saved sentiment model found in known locations")
        except Exception as e:
            logger.error(f"Error loading model: {e}")


class BERTSentimentAnalyzer:
    """BERT sentiment analysis model"""
    
    def __init__(self, language='en'):
        self.language = language
        self.preprocessor = SentimentPreprocessor(language)
        
        if TRANSFORMERS_AVAILABLE:
            # Choose appropriate BERT model based on language
            if language == 'vi':
                self.model_name = "vinai/phobert-base"
            else:
                self.model_name = "cardiffnlp/twitter-roberta-base-sentiment-latest"
        else:
            logger.warning("Transformers library not available. Will use TextBlob fallback.")
            self.model_name = None
        
        self.pipeline = None
        self.is_loaded = False
    
    def load_model(self):
        """Load pre-trained BERT model"""
        if not TRANSFORMERS_AVAILABLE:
            logger.warning("Transformers library not available")
            return
            
        try:
            logger.info(f"Loading BERT model: {self.model_name}")
            self.pipeline = pipeline(
                "sentiment-analysis",
                model=self.model_name,
                return_all_scores=True
            )
            self.is_loaded = True
            logger.info("BERT model loaded successfully")
        except Exception as e:
            logger.error(f"Error loading BERT model: {e}")
            # Fallback to basic model
            try:
                self.pipeline = pipeline("sentiment-analysis", return_all_scores=True)
                self.is_loaded = True
                logger.info("Fallback BERT model loaded")
            except Exception as e2:
                logger.error(f"Error loading fallback model: {e2}")
    
    def predict(self, text: str) -> Dict[str, float]:
        """Predict sentiment using BERT"""
        if not TRANSFORMERS_AVAILABLE or not self.is_loaded:
            if not self.is_loaded:
                self.load_model()
            
            if not self.is_loaded:
                # Fallback to TextBlob
                return self._textblob_fallback(text)
        
        processed_text = self.preprocessor.preprocess(text)
        
        try:
            # Get BERT predictions
            results = self.pipeline(processed_text)
            
            # Process results
            sentiment_scores = {}
            for item in results[0]:
                label = item['label'].lower()
                score = item['score']
                
                # Map different label formats
                if 'pos' in label or label == 'positive':
                    sentiment_scores['positive'] = score
                elif 'neg' in label or label == 'negative':
                    sentiment_scores['negative'] = score
                elif 'neu' in label or label == 'neutral':
                    sentiment_scores['neutral'] = score
            
            # Ensure all sentiments are present
            for sentiment in ['positive', 'negative', 'neutral']:
                if sentiment not in sentiment_scores:
                    sentiment_scores[sentiment] = 0.0
            
            # Determine primary sentiment
            primary_sentiment = max(sentiment_scores, key=sentiment_scores.get)
            confidence = sentiment_scores[primary_sentiment]
            
            return {
                'sentiment': primary_sentiment,
                'confidence': float(confidence),
                'probabilities': sentiment_scores
            }
            
        except Exception as e:
            logger.error(f"Error in BERT prediction: {e}")
            return self._textblob_fallback(text)
    
    def _textblob_fallback(self, text: str) -> Dict[str, float]:
        """Fallback to TextBlob for sentiment analysis"""
        blob = TextBlob(text)
        polarity = blob.sentiment.polarity
        
        # Convert polarity to sentiment categories
        if polarity > 0.1:
            sentiment = 'positive'
            confidence = min(polarity, 1.0)
        elif polarity < -0.1:
            sentiment = 'negative'
            confidence = min(abs(polarity), 1.0)
        else:
            sentiment = 'neutral'
            confidence = 1.0 - abs(polarity)
        
        # Create probability distribution
        probabilities = {'positive': 0.33, 'negative': 0.33, 'neutral': 0.34}
        probabilities[sentiment] = confidence
        
        # Normalize probabilities
        total = sum(probabilities.values())
        probabilities = {k: v/total for k, v in probabilities.items()}
        
        return {
            'sentiment': sentiment,
            'confidence': float(confidence),
            'probabilities': probabilities
        }


class SentimentAnalysisSystem:
    """Main sentiment analysis system with Naive Bayes and BERT"""
    
    def __init__(self, language='en', default_algorithm='naive_bayes'):
        self.language = language
        self.default_algorithm = default_algorithm
        self.naive_bayes = NaiveBayesSentimentAnalyzer(language)
        self.bert = BERTSentimentAnalyzer(language)
    
    def predict(self, text: str, algorithm='auto') -> Dict[str, float]:
        """Predict sentiment using specified algorithm or auto-selection"""
        if algorithm == 'auto':
            algorithm = self.default_algorithm
        
        try:
            if algorithm == 'naive_bayes':
                result = self.naive_bayes.predict(text)
                result['algorithm'] = 'naive_bayes'
                return result
            elif algorithm == 'bert':
                result = self.bert.predict(text)
                result['algorithm'] = 'bert'
                return result
            else:
                logger.warning(f"Unknown algorithm: {algorithm}. Using default.")
                result = self.naive_bayes.predict(text)
                result['algorithm'] = 'naive_bayes'
                return result
        except Exception as e:
            logger.error(f"Error in sentiment prediction: {e}")
            # Fallback to basic TextBlob analysis
            return self.bert._textblob_fallback(text)
    
    def analyze_batch(self, texts: List[str], algorithm='auto') -> List[Dict[str, float]]:
        """Analyze sentiment for multiple texts"""
        return [self.predict(text, algorithm) for text in texts]
    
    def get_algorithm_info(self) -> Dict[str, dict]:
        """Get information about available algorithms"""
        return {
            'naive_bayes': {
                'name': 'Naive Bayes',
                'description': 'Fast, lightweight algorithm for production use',
                'speed': 'Fast (~50ms)',
                'accuracy': 'Good (~60%)',
                'memory': 'Low (~10MB)'
            },
            'bert': {
                'name': 'BERT',
                'description': 'Advanced transformer model for high accuracy',
                'speed': 'Slower (~500ms)',
                'accuracy': 'High (~85%)',
                'memory': 'High (~1000MB)'
            }
        } 