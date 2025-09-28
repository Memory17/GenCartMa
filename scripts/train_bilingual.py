#!/usr/bin/env python3
"""Standalone trainer for bilingual sentiment models (EN + VI)."""
import os
import sys
import logging

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from gencart_backend.sentiment_analysis.kaggle_loaders import (
    EnglishSentimentLoader,
    VietnameseSentimentLoader,
)
from gencart_backend.sentiment_analysis.models import NaiveBayesSentimentAnalyzer


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("train_bilingual")


def main(test_size: float = 0.2):
    # Ensure model dir
    os.makedirs('sentiment_models', exist_ok=True)
    os.makedirs('assets/reports', exist_ok=True)

    logger.info("Loading English dataset ...")
    en_loader = EnglishSentimentLoader()
    en_df = en_loader.load()
    logger.info(f"EN shape: {en_df.shape}")

    # --- Dataset analysis (EN) ---
    try:
        en_cols = list(en_df.columns)
        en_summary = {
            'dataset': 'english_flipkart',
            'num_samples': int(len(en_df)),
            'fields': en_cols,
            'label_counts': en_df['label'].value_counts().to_dict() if 'label' in en_df.columns else {},
        }
        logger.info(f"EN samples: {en_summary['num_samples']}")
        logger.info(f"EN fields: {en_summary['fields']}")
        if en_summary['label_counts']:
            logger.info(f"EN label distribution: {en_summary['label_counts']}")
    except Exception as e:
        logger.warning(f"EN dataset analysis failed: {e}")

    logger.info("Loading Vietnamese dataset ...")
    vi_loader = VietnameseSentimentLoader()
    vi_df = vi_loader.load()
    logger.info(f"VI shape: {vi_df.shape}")

    # --- Dataset analysis (VI) ---
    try:
        vi_cols = list(vi_df.columns)
        vi_summary = {
            'dataset': 'vietnamese_sentiment',
            'num_samples': int(len(vi_df)),
            'fields': vi_cols,
            'label_counts': vi_df['label'].value_counts().to_dict() if 'label' in vi_df.columns else {},
        }
        logger.info(f"VI samples: {vi_summary['num_samples']}")
        logger.info(f"VI fields: {vi_summary['fields']}")
        if vi_summary['label_counts']:
            logger.info(f"VI label distribution: {vi_summary['label_counts']}")
    except Exception as e:
        logger.warning(f"VI dataset analysis failed: {e}")

    # Persist concise dataset overview for report reuse
    try:
        import json
        overview = {'english': en_summary if 'en_summary' in locals() else {},
                    'vietnamese': vi_summary if 'vi_summary' in locals() else {}}
        with open('assets/reports/dataset_overview.json', 'w', encoding='utf-8') as f:
            json.dump(overview, f, indent=2, ensure_ascii=False)
        logger.info("Saved dataset overview to assets/reports/dataset_overview.json")
    except Exception as e:
        logger.warning(f"Could not save dataset overview JSON: {e}")

    # Train EN
    logger.info("Training English Naive Bayes ...")
    en = NaiveBayesSentimentAnalyzer(language='en')
    en_acc = en.train(en_df['text'].tolist(), en_df['label'].tolist(), test_size=test_size)
    en.save_model()
    logger.info(f"EN accuracy: {en_acc:.4f}")

    # Train VI
    logger.info("Training Vietnamese Naive Bayes ...")
    vi = NaiveBayesSentimentAnalyzer(language='vi')
    vi_acc = vi.train(vi_df['text'].tolist(), vi_df['label'].tolist(), test_size=test_size)
    vi.save_model()
    logger.info(f"VI accuracy: {vi_acc:.4f}")

    # Smoke tests
    logger.info("Smoke tests")
    print('EN pred:', en.predict('This product is amazing, super fast delivery'))
    print('VI pred:', vi.predict('Sản phẩm rất tốt, giao hàng nhanh'))

    # Final concise print for report
    try:
        print("\n=== Dataset Overview (for Report) ===")
        if 'en_summary' in locals():
            print(f"EN – samples: {en_summary['num_samples']}")
            print(f"EN – fields: {en_summary['fields']}")
            if en_summary.get('label_counts'):
                print(f"EN – label_counts: {en_summary['label_counts']}")
        if 'vi_summary' in locals():
            print(f"VI – samples: {vi_summary['num_samples']}")
            print(f"VI – fields: {vi_summary['fields']}")
            if vi_summary.get('label_counts'):
                print(f"VI – label_counts: {vi_summary['label_counts']}")
    except Exception as e:
        logger.warning(f"Printing concise dataset overview failed: {e}")


if __name__ == "__main__":
    ts = 0.2
    if len(sys.argv) > 1:
        try:
            ts = float(sys.argv[1])
        except Exception:
            pass
    main(test_size=ts)
