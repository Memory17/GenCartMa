VIETNAMESE_STOPWORDS = {
    # Articles and determiners
    'một', 'các', 'những', 'mọi', 'tất', 'cả', 'này', 'đó', 'kia', 'nọ',
    
    # Prepositions
    'của', 'cho', 'với', 'từ', 'trong', 'trên', 'dưới', 'về', 'đến', 'tại',
    'bằng', 'theo', 'giữa', 'ngoài', 'sau', 'trước', 'qua', 'vào', 'ra',
    
    # Conjunctions
    'và', 'hoặc', 'hay', 'nhưng', 'mà', 'thì', 'nên', 'vì', 'do', 'nếu',
    'khi', 'lúc', 'kể', 'dù', 'mặc', 'tuy', 'song',
    
    # Pronouns
    'tôi', 'bạn', 'anh', 'chị', 'em', 'ông', 'bà', 'cô', 'chú', 'mình',
    'họ', 'nó', 'gì', 'ai', 'đâu', 'nào', 'sao', 'thế',
    
    # Common verbs
    'là', 'có', 'được', 'làm', 'đi', 'đến', 'về', 'ra', 'vào', 'lên',
    'xuống', 'nói', 'thấy', 'biết', 'muốn', 'cần', 'phải', 'đang', 'đã', 'sẽ',
    
    # Quantifiers and numbers
    'nhiều', 'ít', 'hơn', 'kém', 'bằng', 'như', 'cũng', 'còn', 'chỉ', 'chưa',
    'rồi', 'lại', 'nữa', 'thêm', 'bớt', 'hết', 'xong',
    
    # Common adjectives that don't carry sentiment
    'lớn', 'nhỏ', 'to', 'bé', 'dài', 'ngắn', 'cao', 'thấp', 'rộng', 'hẹp',
    'mới', 'cũ', 'trước', 'sau', 'giữa', 'đầu', 'cuối',
    
    # Business/shopping related but non-sentiment
    'sản', 'phẩm', 'hàng', 'món', 'cái', 'chiếc', 'đồ', 'thứ', 'loại',
    'mua', 'bán', 'shop', 'store', 'size', 'màu', 'giá', 'tiền', 'đồng',
    
    # English stopwords commonly found in Vietnamese reviews
    'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before',
    'after', 'above', 'below', 'between', 'among', 'this', 'that', 'these',
    'those', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have',
    'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'may', 'might', 'must', 'can', 'good', 'bad', 'ok', 'okay', 'nice',
    'quality', 'product', 'item'
}

# Sentiment-preserving words (should NOT be removed)
SENTIMENT_PRESERVING = {
    'tốt', 'xấu', 'đẹp', 'chán', 'hay', 'dở', 'tuyệt', 'xuất sắc',
    'tệ', 'kinh khủng', 'ổn', 'bình thường', 'yêu', 'thích', 'ghét',
    'hài lòng', 'thất vọng', 'hư', 'hỏng', 'nhanh', 'chậm', 'chất lượng',
    'rẻ', 'đắt', 'sang', 'rác', 'khủng', 'việt nam', 'vietnam'
}

def get_vietnamese_stopwords():
    """Get Vietnamese stopwords excluding sentiment words"""
    return VIETNAMESE_STOPWORDS - SENTIMENT_PRESERVING

def is_sentiment_word(word):
    """Check if word carries sentiment information"""
    return word.lower() in SENTIMENT_PRESERVING

# Emotion keywords for enhanced sentiment
POSITIVE_EMOTIONS = {
    'tuyệt vời', 'xuất sắc', 'hoàn hảo', 'tốt', 'đẹp', 'ổn', 'hài lòng',
    'yêu thích', 'recommend', 'nhanh', 'chất lượng', 'đáng tiền', 'ưng ý'
}

NEGATIVE_EMOTIONS = {
    'tệ', 'dở', 'xấu', 'hỏng', 'hư', 'chậm', 'thất vọng', 'không hài lòng',
    'tối tệ', 'kinh khủng', 'rác', 'phí tiền', 'chán', 'không đáng'
}

def extract_emotion_features(text):
    """Extract emotion-based features from text"""
    text_lower = text.lower()
    
    positive_count = sum(1 for emotion in POSITIVE_EMOTIONS if emotion in text_lower)
    negative_count = sum(1 for emotion in NEGATIVE_EMOTIONS if emotion in text_lower)
    
    return {
        'positive_emotions': positive_count,
        'negative_emotions': negative_count,
        'emotion_ratio': positive_count / max(negative_count, 1)
    }