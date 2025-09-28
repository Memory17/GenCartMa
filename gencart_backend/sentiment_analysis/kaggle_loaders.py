"""
Kaggle dataset loaders for English and Vietnamese sentiment datasets with robust CSV handling.
"""
from typing import Optional, List
import os
import logging
import pandas as pd

logger = logging.getLogger(__name__)


class BaseKaggleLoader:
    dataset_id: str = ""

    def __init__(self):
        self.dataset_path: Optional[str] = None
        self.df: Optional[pd.DataFrame] = None

    def download(self) -> str:
        import kagglehub
        logger.info(f"Downloading Kaggle dataset: {self.dataset_id}")
        self.dataset_path = kagglehub.dataset_download(self.dataset_id)
        logger.info(f"Dataset downloaded to: {self.dataset_path}")
        return self.dataset_path

    def _try_read_csv(self, filepath: str) -> pd.DataFrame:
        errors = []
        for enc in ['utf-8', 'utf-8-sig', 'latin-1', 'cp1252', 'iso-8859-1']:
            try:
                return pd.read_csv(filepath, encoding=enc)
            except Exception as e:
                errors.append(f"{enc}: {e}")
        raise ValueError(f"Failed to read CSV {filepath}. Tried encodings: {errors}")

    def load(self) -> pd.DataFrame:
        if not self.dataset_path:
            self.download()
        files = os.listdir(self.dataset_path)
        priority: List[str] = self.get_priority_files(files)
        for name in priority:
            if name in files:
                fp = os.path.join(self.dataset_path, name)
                df = self._try_read_csv(fp)
                self.df = df
                return self.process_dataframe(name)
        # Fallback: first CSV
        csvs = [f for f in files if f.lower().endswith('.csv')]
        if not csvs:
            raise ValueError("No CSV files found in Kaggle dataset")
        fp = os.path.join(self.dataset_path, csvs[0])
        df = self._try_read_csv(fp)
        self.df = df
        return self.process_dataframe(csvs[0])

    def get_priority_files(self, files: List[str]) -> List[str]:
        return []

    def process_dataframe(self, filename: str) -> pd.DataFrame:
        raise NotImplementedError

    @staticmethod
    def to_binary(df: pd.DataFrame) -> pd.DataFrame:
        """Ensure df has 'text' and binary numeric 'label' 0/1 columns."""
        if 'sentiment' in df.columns and 'label' not in df.columns:
            mapping = {
                'negative': 0,
                'neg': 0,
                '0': 0,
                0: 0,
                'positive': 1,
                'pos': 1,
                '1': 1,
                1: 1,
            }
            df = df.copy()
            df['label'] = df['sentiment'].map(lambda v: mapping.get(v, v))
        # Drop neutrals if any
        if 'label' in df.columns:
            df = df[df['label'].isin([0, 1])].copy()
        # Standard columns
        if set(['text', 'label']).issubset(df.columns):
            return df[['text', 'label']]
        raise ValueError("Dataframe missing required columns 'text' and 'label'")


class EnglishSentimentLoader(BaseKaggleLoader):
    # Replace old English dataset with Flipkart reviews as the default source
    dataset_id = "niraliivaghani/flipkart-product-customer-reviews-dataset"

    def get_priority_files(self, files: List[str]) -> List[str]:
        # Prefer CSVs clearly containing reviews; typical main file name in this dataset is 'Dataset-SA.csv'
        preferred = []
        for name in files:
            ln = name.lower()
            if ln.endswith('.csv') and ('review' in ln or 'dataset-sa' in ln or 'flipkart' in ln):
                preferred.append(name)
        # Fallback: any CSV
        others = [f for f in files if f.lower().endswith('.csv') and f not in preferred]
        return preferred + others

    def process_dataframe(self, filename: str) -> pd.DataFrame:
        df = self.df
        # Generic robust detection of text/label columns
        import re
        text_col = None
        label_col = None

        name_priority_exact = {'text', 'review', 'review_text', 'reviewbody', 'review_body', 'selected_text', 'tweet'}
        name_keywords = ['text', 'review', 'message', 'content', 'body', 'comment']
        name_exclude = ['id', 'userid', 'textid', 'hash', 'guid', 'uuid']

        def is_id_like_series(s: pd.Series) -> bool:
            try:
                sample = s.dropna().astype(str).head(50).tolist()
            except Exception:
                return False
            if not sample:
                return False
            no_space = sum(' ' not in v for v in sample) / len(sample)
            hexish = sum(bool(re.fullmatch(r'[0-9a-fA-F]{6,}', v)) for v in sample) / len(sample)
            long_token = sum(bool(re.fullmatch(r'[A-Za-z0-9_\-]{8,}', v)) for v in sample) / len(sample)
            return (no_space > 0.9) and (hexish > 0.4 or long_token > 0.7)

        candidates = []
        for c in df.columns:
            lc = str(c).lower().strip()
            if not pd.api.types.is_object_dtype(df[c]):
                continue
            name_score = 0
            if lc in name_priority_exact:
                name_score = 100
            elif any(k == lc for k in ['review', 'message', 'content', 'comment', 'body']):
                name_score = 90
            elif any(k in lc for k in name_keywords) and not any(ex in lc for ex in name_exclude):
                name_score = 70
            elif 'text' in lc and any(ex in lc for ex in name_exclude):
                name_score = 5

            try:
                sample = df[c].dropna().astype(str).head(50)
                avg_len = sample.map(len).mean() if not sample.empty else 0
                space_ratio = (sample.str.contains(r'\s').sum() / len(sample)) if len(sample) else 0
            except Exception:
                avg_len, space_ratio = 0, 0
            content_score = 0
            if space_ratio > 0.2 and avg_len > 15:
                content_score = 100
            elif space_ratio > 0.1 and avg_len > 8:
                content_score = 60
            if is_id_like_series(df[c]):
                if lc in name_priority_exact:
                    name_score = 0
                content_score -= 200

            total = name_score + content_score
            candidates.append((total, name_score, content_score, c))

        if candidates:
            candidates.sort(reverse=True)
            text_col = candidates[0][3]

        for c in df.columns:
            lc = str(c).lower()
            if label_col is None and any(k in lc for k in ['sentiment', 'label', 'polarity', 'target', 'class', 'stars', 'rating']):
                label_col = c

        if text_col is None:
            obj_cols = [c for c in df.columns if pd.api.types.is_object_dtype(df[c])]
            if obj_cols:
                for c in obj_cols:
                    if not is_id_like_series(df[c]):
                        text_col = c
                        break
                if text_col is None:
                    text_col = obj_cols[0]
            else:
                text_col = df.columns[0]
        if label_col is None:
            num_cols = [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c])]
            label_col = num_cols[0] if num_cols else df.columns[-1]

        logger.info(f"English loader (Flipkart) selected text column: '{text_col}' and label column: '{label_col}' from file '{filename}'")
        df = df[[text_col, label_col]].rename(columns={text_col: 'text', label_col: 'sentiment'})
        df = df.dropna()
        # Normalize sentiments (support both numeric ratings and 0/1 labels)
        if df['sentiment'].dtype != object:
            # If values are 0/1 → map directly; if star ratings → map >=4 to positive, <=2 to negative, 3 neutral
            try:
                df['sentiment'] = df['sentiment'].astype(float)
                if df['sentiment'].isin([0.0, 1.0]).all():
                    df['sentiment'] = df['sentiment'].map({0.0: 'negative', 1.0: 'positive'})
                else:
                    df['sentiment'] = df['sentiment'].map(lambda x: 'positive' if x >= 4 else ('negative' if x <= 2 else 'neutral'))
            except Exception:
                df['sentiment'] = df['sentiment'].map({0: 'negative', 1: 'positive', 2: 'neutral'}).fillna('neutral')
        else:
            df['sentiment'] = df['sentiment'].astype(str).str.lower()
        return self.to_binary(df)


class VietnameseSentimentLoader(BaseKaggleLoader):
    dataset_id = "linhlpv/vietnamese-sentiment-analyst"

    def get_priority_files(self, files: List[str]) -> List[str]:
        # Common names seen in community Vietnamese sentiment datasets
        return [
            'train.csv', 'training.csv', 'reviews.csv', 'dataset.csv', 'data.csv'
        ]

    def process_dataframe(self, filename: str) -> pd.DataFrame:
        df = self.df
        # Try to identify text and label columns
        text_col = None
        label_col = None
        for c in df.columns:
            lc = str(c).lower().strip()
            if text_col is None and any(k in lc for k in ['text', 'review', 'comment', 'content']):
                text_col = c
            if label_col is None and any(k in lc for k in ['label', 'sentiment', 'polarity', 'target', 'rating']):
                label_col = c
        if text_col is None:
            text_col = df.select_dtypes(include=['object']).columns[0]
        if label_col is None:
            label_col = df.columns[-1]
        df = df[[text_col, label_col]].rename(columns={text_col: 'text', label_col: 'sentiment'})
        df = df.dropna()
        # Normalize label to pos/neg
        def norm(v):
            s = str(v).strip().lower()
            if s in {'1', 'pos', 'positive', 'tích cực', 'tot', 'tốt', 'hài lòng'}:
                return 'positive'
            if s in {'0', 'neg', 'negative', 'tiêu cực', 'xau', 'xấu', 'không hài lòng'}:
                return 'negative'
            if s in {'neu', 'neutral', 'bình thường'}:
                return 'neutral'
            # default treat as neutral
            return 'neutral'
        df['sentiment'] = df['sentiment'].apply(norm)
        out = self.to_binary(df)
        return out
