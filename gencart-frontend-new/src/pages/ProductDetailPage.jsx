import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Typography,
  Row,
  Col,
  Card,
  Button,
  InputNumber,
  Tabs,
  Breadcrumb,
  Image,
  Spin,
  message,
  Rate,
  Form,
  Input,
  Modal,
  Avatar,
  Divider,
  Space,
  Empty,
  Tag
} from 'antd';
import {
  ShoppingCartOutlined,
  HeartOutlined,
  ShareAltOutlined,
  HomeOutlined,
  StarOutlined,
  UserOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { useCart } from '../context/CartContext';
import { inventoryEvents } from '../utils/inventoryEvents';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// Helper function to get a color based on category name
const getCategoryColor = (categoryName) => {
  const categoryColors = {
    'Electronics': '2196F3',
    'Clothing': '4CAF50',
    'Home & Kitchen': 'FF9800',
    'Books': '9C27B0',
    'Sports & Outdoors': 'F44336',
    'Phone & Accessories': '009688',
  };

  // Return the color for the category or a default color
  return categoryColors[categoryName] || '607D8B';
};

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [canReview, setCanReview] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewForm] = Form.useForm();
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        // Add request headers to ensure we get proper URLs
        const headers = {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        };

        const response = await fetch(`http://localhost:8000/api/products/${id}/`, { headers });
        if (!response.ok) {
          throw new Error('Failed to fetch product');
        }
        const data = await response.json();
        console.log('Product detail data:', data);

        // Log image-related fields
        console.log('Image URL from API:', data.image_url);

        setProduct(data);
        setReviews(data.reviews || []);

        // Fetch related products from the same category
        if (data.category && data.category.id) {
          fetchRelatedProducts(data.category.id, data.id);
        }

        // Check if user can review this product
        checkCanReview();
      } catch (error) {
        console.error('Error fetching product:', error);
        message.error('Failed to load product details');
      } finally {
        setLoading(false);
      }
    };

    const fetchRelatedProducts = async (categoryId, productId) => {
      try {
        // Add request headers to ensure we get proper URLs
        const headers = {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        };

        const response = await fetch(`http://localhost:8000/api/products/?category=${categoryId}`, { headers });
        if (!response.ok) {
          throw new Error('Failed to fetch related products');
        }
        const data = await response.json();
        // Filter out the current product and limit to 4 related products
        let filtered = (data.results || data)
          .filter(p => p.id !== parseInt(productId))
          .slice(0, 4);

        setRelatedProducts(filtered);
      } catch (error) {
        console.error('Error fetching related products:', error);
      }
    };

    const checkCanReview = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        const response = await fetch(`http://localhost:8000/api/products/${id}/can_review/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setCanReview(data.can_review);
          setHasReviewed(data.has_reviewed);
          setHasPurchased(data.has_purchased);
        }
      } catch (error) {
        console.error('Error checking review eligibility:', error);
      }
    };

    if (id) {
      fetchProduct();
    }

    // Listen for inventory refresh events
    const unsubscribe = inventoryEvents.subscribe((event) => {
      if (event.type === 'ALL_REFRESH' || 
          (event.type === 'PRODUCT_REFRESH' && event.productId === parseInt(id))) {
        console.log('Refreshing product inventory due to event:', event);
        fetchProduct(); // Refetch product data to get updated inventory
      }
    });

    // Cleanup listener on unmount or when id changes
    return () => {
      unsubscribe();
    };
  }, [id]);

  const handleQuantityChange = (value) => {
    setQuantity(value);
  };

  // Get cart functions from context
  const { addToCart: addToCartContext } = useCart();

  const addToCart = () => {
    if (product) {
      addToCartContext(product, quantity);
      message.success(`${quantity} ${product.name}(s) added to cart!`);
    }
  };

  const handleAddReview = () => {
    setReviewModalVisible(true);
  };

  const handleReviewSubmit = async (values) => {
    setSubmittingReview(true);
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        message.error('Please login to add a review');
        navigate('/login');
        return;
      }

      const response = await fetch(`http://localhost:8000/api/products/${id}/add_review/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating: values.rating,
          title: values.title,
          comment: values.comment,
        }),
      });

      if (response.ok) {
        const newReview = await response.json();
        setReviews([newReview, ...reviews]);
        setReviewModalVisible(false);
        setCanReview(false);
        setHasReviewed(true);
        reviewForm.resetFields();
        message.success('Review added successfully!');
        
        // Refresh product data to get updated average rating
        const productResponse = await fetch(`http://localhost:8000/api/products/${id}/`);
        if (productResponse.ok) {
          const updatedProduct = await productResponse.json();
          setProduct(updatedProduct);
        }
      } else {
        const errorData = await response.json();
        message.error(errorData.error || 'Failed to add review');
      }
    } catch (error) {
      console.error('Error adding review:', error);
      message.error('Failed to add review. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const renderStarRating = (rating, totalReviews) => {
    return (
      <Space>
        <Rate disabled value={rating} />
        <Text strong>{rating}</Text>
        <Text type="secondary">({totalReviews} reviews)</Text>
      </Space>
    );
  };

  const renderReviews = () => {
    if (reviews.length === 0) {
      return (
        <Empty 
          description="No reviews yet" 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          {canReview && (
            <Button type="primary" onClick={handleAddReview}>
              Be the first to review
            </Button>
          )}
        </Empty>
      );
    }

    return (
      <div>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {reviews.map(review => (
            <Card key={review.id} size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space>
                  <Avatar icon={<UserOutlined />} />
                  <div>
                    <Text strong>
                      {review.user_first_name && review.user_last_name 
                        ? `${review.user_first_name} ${review.user_last_name}`
                        : review.user_name}
                    </Text>
                    {review.verified_purchase && (
                      <Tag color="green" icon={<CheckCircleOutlined />} style={{ marginLeft: 8 }}>
                        Verified Purchase
                      </Tag>
                    )}
                  </div>
                </Space>
                
                <Space>
                  <Rate disabled value={review.rating} />
                  <Text strong>{review.title}</Text>
                </Space>
                
                <Text>{review.comment}</Text>
                
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {new Date(review.created_at).toLocaleDateString()}
                </Text>
              </Space>
            </Card>
          ))}
        </Space>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Title level={3}>Product not found</Title>
        <Button type="primary" onClick={() => navigate('/products')}>
          Back to Products
        </Button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      {/* Breadcrumb */}
      <Breadcrumb style={{ marginBottom: '20px' }}>
        <Breadcrumb.Item>
          <Link to="/"><HomeOutlined /> Home</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <Link to="/products">Products</Link>
        </Breadcrumb.Item>
        {product.category && (
          <Breadcrumb.Item>
            <Link to={`/products?category=${product.category.id}`}>
              {product.category.name}
            </Link>
          </Breadcrumb.Item>
        )}
        <Breadcrumb.Item>{product.name}</Breadcrumb.Item>
      </Breadcrumb>

      {/* Product Details */}
      <Row gutter={[32, 32]}>
        {/* Product Images */}
        <Col xs={24} md={12}>
          <Card>
            <Image
              src={
                product.image_url ||
                product.primary_image ||
                "https://placehold.co/500x500/lightgray/darkgray?text=No+Image"
              }
              alt={product.name}
              style={{ width: '100%', height: 'auto' }}
            />
          </Card>
        </Col>

        {/* Product Info */}
        <Col xs={24} md={12}>
          <Title level={2}>{product.name}</Title>

          {/* Rating */}
          {product.total_reviews > 0 && (
            <div style={{ margin: '10px 0' }}>
              {renderStarRating(product.average_rating, product.total_reviews)}
            </div>
          )}

          {/* Price */}
          <div style={{ margin: '20px 0' }}>
            {product.discount_price ? (
              <>
                <Text delete style={{ fontSize: '18px' }}>
                  ₫{parseFloat(product.price || 0).toFixed(2)}
                </Text>
                <Text strong style={{ fontSize: '24px', marginLeft: 16, color: '#f5222d' }}>
                  ₫{parseFloat(product.discount_price || 0).toFixed(2)}
                </Text>
              </>
            ) : (
              <Text strong style={{ fontSize: '24px' }}>
                ₫{parseFloat(product.price || 0).toFixed(2)}
              </Text>
            )}
          </div>

          {/* Category */}
          <div style={{ margin: '10px 0' }}>
            <Text type="secondary">
              Category: {product.category ? (
                <Link to={`/products?category=${product.category.id}`}>
                  {product.category.name}
                </Link>
              ) : 'Uncategorized'}
            </Text>
          </div>

          {/* Inventory */}
          <div style={{ margin: '10px 0' }}>
            {product.inventory !== undefined && product.inventory > 0 ? (
              <Text type="success">In Stock ({product.inventory} available)</Text>
            ) : (
              <Text type="danger">Out of Stock</Text>
            )}
          </div>

          {/* Short Description */}
          <Paragraph style={{ margin: '20px 0' }}>
            {product.description ? product.description.split('\n')[0] : 'No description available.'}
          </Paragraph>

          {/* Quantity and Add to Cart */}
          <div style={{ margin: '20px 0' }}>
            <Row gutter={16} align="middle">
              <Col>
                <InputNumber
                  min={1}
                  max={product.inventory}
                  defaultValue={1}
                  value={quantity}
                  onChange={handleQuantityChange}
                  disabled={product.inventory <= 0}
                />
              </Col>
              <Col>
                <Button
                  type="primary"
                  icon={<ShoppingCartOutlined />}
                  size="large"
                  onClick={addToCart}
                  disabled={product.inventory <= 0}
                >
                  Add to Cart
                </Button>
              </Col>
            </Row>
          </div>

          {/* Review Action Button */}
          {canReview && (
            <div style={{ margin: '20px 0' }}>
              <Button
                type="default"
                icon={<StarOutlined />}
                onClick={handleAddReview}
              >
                Write a Review
              </Button>
            </div>
          )}

          {hasReviewed && (
            <div style={{ margin: '20px 0' }}>
              <Text type="success">
                <CheckCircleOutlined /> You have already reviewed this product
              </Text>
            </div>
          )}

          {!hasPurchased && !canReview && !hasReviewed && (
            <div style={{ margin: '20px 0' }}>
              <Text type="secondary">
                You can only review products you have purchased and received
              </Text>
            </div>
          )}
        </Col>
      </Row>

      {/* Product Tabs */}
      <div style={{ margin: '40px 0' }}>
        <Tabs defaultActiveKey="description">
          <Tabs.TabPane tab="Description" key="description">
            <Paragraph style={{ whiteSpace: 'pre-line' }}>
              {product.description || 'No description available.'}
            </Paragraph>
          </Tabs.TabPane>
          <Tabs.TabPane tab="Specifications" key="specifications">
            <p>Product specifications would be displayed here.</p>
          </Tabs.TabPane>
          <Tabs.TabPane tab={`Reviews (${reviews.length})`} key="reviews">
            <div style={{ marginBottom: '20px' }}>
              {canReview && (
                <Button
                  type="primary"
                  icon={<StarOutlined />}
                  onClick={handleAddReview}
                  style={{ marginBottom: '20px' }}
                >
                  Write a Review
                </Button>
              )}
            </div>
            {renderReviews()}
          </Tabs.TabPane>
        </Tabs>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div style={{ margin: '40px 0' }}>
          <Title level={3}>Related Products</Title>
          <Row gutter={[16, 16]}>
            {relatedProducts.map(relatedProduct => (
              <Col xs={24} sm={12} md={6} key={relatedProduct.id}>
                <Card
                  hoverable
                  cover={
                    <img
                      alt={relatedProduct.name}
                      src={
                        relatedProduct.image_url ||
                        relatedProduct.primary_image ||
                        'https://placehold.co/300x200/lightgray/darkgray?text=No+Image'
                      }
                      style={{ height: '200px', objectFit: 'cover' }}
                    />
                  }
                >
                  <Card.Meta
                    title={relatedProduct.name}
                    description={
                      <div>
                        {relatedProduct.average_rating > 0 && (
                          <div style={{ marginBottom: '8px' }}>
                            <Rate disabled value={relatedProduct.average_rating} />
                            <Text type="secondary" style={{ marginLeft: '8px' }}>
                              ({relatedProduct.total_reviews})
                            </Text>
                          </div>
                        )}
                        <Text strong>
                          ₫{parseFloat(relatedProduct.discount_price || relatedProduct.price || 0).toFixed(2)}
                        </Text>
                      </div>
                    }
                  />
                  <div style={{ marginTop: '10px' }}>
                    <Link to={`/products/${relatedProduct.id}`}>
                      <Button type="primary" block>View Details</Button>
                    </Link>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      )}

      {/* Review Modal */}
      <Modal
        title="Write a Review"
        open={reviewModalVisible}
        onCancel={() => setReviewModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={reviewForm}
          layout="vertical"
          onFinish={handleReviewSubmit}
        >
          <Form.Item
            name="rating"
            label="Rating"
            rules={[{ required: true, message: 'Please provide a rating!' }]}
          >
            <Rate />
          </Form.Item>

          <Form.Item
            name="title"
            label="Review Title"
            rules={[
              { required: true, message: 'Please provide a review title!' },
              { max: 200, message: 'Title must be less than 200 characters!' }
            ]}
          >
            <Input placeholder="Summarize your experience" />
          </Form.Item>

          <Form.Item
            name="comment"
            label="Review"
            rules={[{ required: true, message: 'Please write your review!' }]}
          >
            <TextArea
              rows={4}
              placeholder="Tell us about your experience with this product"
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={submittingReview}>
                Submit Review
              </Button>
              <Button onClick={() => setReviewModalVisible(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProductDetailPage;
