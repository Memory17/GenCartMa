import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Tag, 
  Button, 
  Space, 
  Card, 
  Empty, 
  Spin, 
  Tabs, 
  message, 
  Modal, 
  Row, 
  Col, 
  Badge,
  Tooltip
} from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CarOutlined,
  ExclamationCircleOutlined,
  DeleteOutlined,
  InboxOutlined,
  EyeOutlined,
  StarOutlined,
  CalendarOutlined,
  DollarOutlined,
  BoxPlotOutlined,
  TruckOutlined
} from '@ant-design/icons';
import { getValidImageUrl, handleImageError } from '../utils/imageUtils';

const { Title, Text, Paragraph } = Typography;

const OrdersPage = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [reviewableProducts, setReviewableProducts] = useState(new Map());

  // Fetch orders data
  const fetchOrders = async () => {
    setLoading(true);
    try {
      // Get token from localStorage
      const token = localStorage.getItem('access_token');

      if (!token) {
        // If not logged in, redirect to login
        message.info('Please login to view your orders');
        navigate('/login');
        return;
      }

      // Fetch orders from API
      const response = await fetch('http://localhost:8000/api/orders/', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();

      // Format orders data
      const formattedOrders = data.results.map(order => {
        // Format shipping address
        const shippingAddress = order.shipping_address ?
          `${order.shipping_address.street_address}${order.shipping_address.apartment_address ? ', ' + order.shipping_address.apartment_address : ''},
           ${order.shipping_address.city}, ${order.shipping_address.state}, ${order.shipping_address.zip_code}` :
          'No address provided';

        // Log order items for debugging
        console.log('Order items:', order.items);
        if (order.items.length > 0 && order.items[0].product) {
          console.log('First product image URL:', order.items[0].product.primary_image);
        }

        return {
          id: order.id,
          date: new Date(order.created_at).toISOString().split('T')[0],
          total: parseFloat(order.total_amount),
          status: order.status,
          items: order.items.map(item => {
            // Log each product's image URL
            if (item.product) {
              console.log(`Product ${item.product.name} image:`, item.product.primary_image);
            }

            return {
              id: item.id,
              name: item.product ? item.product.name : 'Product',
              quantity: item.quantity,
              price: parseFloat(item.price),
              image: item.product ? (item.product.image_url || item.product.primary_image) : null,
              product_id: item.product ? item.product.id : null,
              discount_price: item.product && item.product.discount_price ? parseFloat(item.product.discount_price) : null,
            };
          }),
          shipping: {
            address: shippingAddress,
            method: 'Standard Delivery'
          },
          payment: {
            method: order.payment_status ? 'Paid' : 'Pending',
            status: order.payment_status
          }
        };
      });

      setOrders(formattedOrders);

      // Check reviewable products for delivered orders
      checkReviewableProducts(formattedOrders.filter(order => order.status === 'delivered'));
    } catch (error) {
      console.error('Error fetching orders:', error);
      message.error('Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Check which products can be reviewed
  const checkReviewableProducts = async (deliveredOrders) => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const reviewableMap = new Map();

      for (const order of deliveredOrders) {
        const productReviewPromises = order.items.map(async (item) => {
          if (!item.product_id) return null;
          
          try {
            const response = await fetch(`http://localhost:8000/api/products/${item.product_id}/can_review/`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
              },
            });

            if (response.ok) {
              const data = await response.json();
              return {
                product_id: item.product_id,
                can_review: data.can_review,
                has_reviewed: data.has_reviewed
              };
            }
          } catch (error) {
            console.error(`Error checking review status for product ${item.product_id}:`, error);
          }
          return null;
        });

        const results = await Promise.all(productReviewPromises);
        const orderReviewData = {};
        
        results.forEach(result => {
          if (result) {
            orderReviewData[result.product_id] = {
              can_review: result.can_review,
              has_reviewed: result.has_reviewed
            };
          }
        });

        reviewableMap.set(order.id, orderReviewData);
      }

      setReviewableProducts(reviewableMap);
    } catch (error) {
      console.error('Error checking reviewable products:', error);
    }
  };

  // Cancel order
  const handleCancelOrder = async () => {
    if (!selectedOrderId) return;

    setCancelLoading(true);
    try {
      // Get token from localStorage
      const token = localStorage.getItem('access_token');

      if (!token) {
        message.error('Authentication error. Please login again.');
        navigate('/login');
        return;
      }

      // Call API to cancel order
      const response = await fetch(`http://localhost:8000/api/orders/${selectedOrderId}/cancel_order/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to cancel order');
      }

      message.success('Order cancelled successfully');
      setModalVisible(false);

      // Refresh orders list
      fetchOrders();
    } catch (error) {
      console.error('Error cancelling order:', error);
      message.error(error.message || 'Failed to cancel order. Please try again.');
    } finally {
      setCancelLoading(false);
    }
  };

  // Show cancel confirmation modal
  const showCancelConfirm = (orderId) => {
    setSelectedOrderId(orderId);
    setModalVisible(true);
  };

  // Navigate to product to review
  const handleReviewProduct = (productId) => {
    navigate(`/products/${productId}`);
  };

  useEffect(() => {
    fetchOrders();
  }, [navigate]);

  // Get status tag
  const getStatusTag = (status) => {
    const statusConfig = {
      processing: { color: 'blue', text: 'Processing', icon: <ClockCircleOutlined /> },
      shipped: { color: 'cyan', text: 'Shipped', icon: <TruckOutlined /> },
      delivered: { color: 'green', text: 'Delivered', icon: <CheckCircleOutlined /> },
      cancelled: { color: 'red', text: 'Cancelled', icon: <ExclamationCircleOutlined /> },
    };

    const config = statusConfig[status] || { color: 'default', text: status, icon: null };
    
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    );
  };

  // Check if order has reviewable products
  const hasReviewableProducts = (orderId) => {
    const orderReviewData = reviewableProducts.get(orderId);
    if (!orderReviewData) return false;
    
    return Object.values(orderReviewData).some(data => data.can_review);
  };

  // Render simple order card
  const renderOrderCard = (order) => {
    // Calculate expected delivery date (order date + 5 days for standard delivery)
    // Note: This is a simple calculation - in a real app, this would come from:
    // 1. Shipping provider APIs (FedEx, UPS, DHL)
    // 2. Backend calculation based on shipping method and location
    // 3. Warehouse processing time + transit time
    const orderDate = new Date(order.date);
    const deliveryDate = new Date(orderDate);
    deliveryDate.setDate(deliveryDate.getDate() + 5); // Add 5 business days

    const formattedDeliveryDate = deliveryDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    const orderReviewData = reviewableProducts.get(order.id) || {};

    return (
      <Card
        key={order.id}
        style={{
          marginBottom: '16px',
          borderRadius: '8px',
          border: '1px solid #e8e8e8',
        }}
      >
        {/* Simple Order Header */}
        <Row justify="space-between" align="middle" style={{ marginBottom: '16px' }}>
          <Col>
            <Space direction="vertical" size={4}>
              <Text strong style={{ fontSize: '16px' }}>
                Order #{order.id}
              </Text>
              <Text type="secondary" style={{ fontSize: '14px' }}>
                {new Date(order.date).toLocaleDateString()}
              </Text>
            </Space>
          </Col>
          <Col>
            <Space direction="vertical" size={4} align="end">
              <Text strong style={{ fontSize: '18px', color: '#1890ff' }}>
                ₫{order.total.toFixed(2)}
              </Text>
              {getStatusTag(order.status)}
            </Space>
          </Col>
        </Row>

        {/* Order Summary */}
        <Row gutter={16} style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#fafafa', borderRadius: '4px' }}>
          <Col span={8}>
            <Text strong>{order.items.length}</Text>
            <Text type="secondary" style={{ display: 'block', fontSize: '12px' }}>Items</Text>
          </Col>
          <Col span={8}>
            <Text strong>{formattedDeliveryDate}</Text>
            <Text type="secondary" style={{ display: 'block', fontSize: '12px' }}>Expected Delivery</Text>
          </Col>
          <Col span={8}>
            <Text strong>{order.payment.status ? 'Paid' : 'Pending'}</Text>
            <Text type="secondary" style={{ display: 'block', fontSize: '12px' }}>Payment</Text>
          </Col>
        </Row>

        {/* Products */}
        <div style={{ marginBottom: '16px' }}>
          <Text strong style={{ marginBottom: '8px', display: 'block' }}>Products:</Text>
          <Row gutter={[8, 8]}>
            {order.items.map(item => {
              const productReviewData = orderReviewData[item.product_id] || {};
              const canReviewProduct = productReviewData.can_review;
              const hasReviewedProduct = productReviewData.has_reviewed;

              return (
                <Col xs={12} sm={8} md={6} key={item.id}>
                  <Card
                    size="small"
                    hoverable
                    style={{ height: '100%' }}
                    cover={
                      <div style={{ height: '80px', overflow: 'hidden', backgroundColor: '#f5f5f5' }}>
                        <img
                          src={getValidImageUrl(item.image, item.name, 80, 80)}
                          alt={item.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => handleImageError(e, item.name, 80, 80)}
                        />
                      </div>
                    }
                  >
                    <Tooltip title={item.name}>
                      <Text style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                        {item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name}
                      </Text>
                    </Tooltip>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <Text style={{ fontSize: '11px' }}>Qty: {item.quantity}</Text>
                      <Text style={{ fontSize: '12px', fontWeight: '500' }}>₫{item.price}</Text>
                    </div>

                    {/* Simple Review Status */}
                    {order.status === 'delivered' && item.product_id && (
                      <div style={{ textAlign: 'center' }}>
                        {hasReviewedProduct ? (
                          <Tag color="green" style={{ fontSize: '10px' }}>
                            <CheckCircleOutlined /> Reviewed
                          </Tag>
                        ) : canReviewProduct ? (
                          <Button 
                            type="link"
                            size="small"
                            icon={<StarOutlined />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReviewProduct(item.product_id);
                            }}
                            style={{ fontSize: '10px', padding: '0' }}
                          >
                            Review
                          </Button>
                        ) : (
                          <Tag style={{ fontSize: '10px' }}>Not Eligible</Tag>
                        )}
                      </div>
                    )}
                  </Card>
                </Col>
              );
            })}
          </Row>
        </div>

        {/* Action Buttons */}
        <div style={{ borderTop: '1px solid #e8e8e8', paddingTop: '12px' }}>
          <Space>
            <Button
              type="primary"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/orders/${order.id}`)}
            >
              View Details
            </Button>

            {(order.status === 'pending' || order.status === 'processing') && (
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={() => showCancelConfirm(order.id)}
              >
                Cancel Order
              </Button>
            )}

            {order.status === 'delivered' && hasReviewableProducts(order.id) && (
              <Button
                icon={<StarOutlined />}
                onClick={() => navigate(`/orders/${order.id}`)}
              >
                Review Products
              </Button>
            )}
          </Space>
        </div>
      </Card>
    );
  };

  // Filter orders by status
  const getFilteredOrders = (status) => {
    if (status === 'all') return orders;
    return orders.filter(order => order.status === status);
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      {/* Simple Header */}
      <div style={{ marginBottom: '24px', textAlign: 'center' }}>
        <Title level={2} style={{ margin: '0 0 8px 0' }}>
          <ShoppingOutlined /> My Orders
        </Title>
        <Text type="secondary">Track and manage your orders</Text>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', backgroundColor: 'white', borderRadius: '8px' }}>
            <Spin size="large" />
            <div style={{ marginTop: '16px' }}>
              <Text>Loading your orders...</Text>
            </div>
          </div>
        ) : orders.length > 0 ? (
          <Card style={{ borderRadius: '8px' }}>
            <Tabs
              defaultActiveKey="all"
              items={[
                {
                  key: 'all',
                  label: `All Orders (${orders.length})`,
                  children: (
                    <div>
                      {getFilteredOrders('all').map(order => renderOrderCard(order))}
                    </div>
                  )
                },
                {
                  key: 'processing',
                  label: `Processing (${getFilteredOrders('processing').length})`,
                  children: (
                    <div>
                      {getFilteredOrders('processing').map(order => renderOrderCard(order))}
                      {getFilteredOrders('processing').length === 0 && (
                        <Empty description="No processing orders" />
                      )}
                    </div>
                  )
                },
                {
                  key: 'shipped',
                  label: `Shipped (${getFilteredOrders('shipped').length})`,
                  children: (
                    <div>
                      {getFilteredOrders('shipped').map(order => renderOrderCard(order))}
                      {getFilteredOrders('shipped').length === 0 && (
                        <Empty description="No shipped orders" />
                      )}
                    </div>
                  )
                },
                {
                  key: 'delivered',
                  label: `Delivered (${getFilteredOrders('delivered').length})`,
                  children: (
                    <div>
                      {getFilteredOrders('delivered').map(order => renderOrderCard(order))}
                      {getFilteredOrders('delivered').length === 0 && (
                        <Empty description="No delivered orders" />
                      )}
                    </div>
                  )
                },
                {
                  key: 'cancelled',
                  label: `Cancelled (${getFilteredOrders('cancelled').length})`,
                  children: (
                    <div>
                      {getFilteredOrders('cancelled').map(order => renderOrderCard(order))}
                      {getFilteredOrders('cancelled').length === 0 && (
                        <Empty description="No cancelled orders" />
                      )}
                    </div>
                  )
                }
              ]}
            />
          </Card>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px', backgroundColor: 'white', borderRadius: '8px' }}>
            <Empty description="You haven't placed any orders yet">
              <Button type="primary">
                <Link to="/products">Start Shopping</Link>
              </Button>
            </Empty>
          </div>
        )}
      </div>

      {/* Cancel Order Modal */}
      <Modal
        title="Cancel Order"
        open={modalVisible}
        onOk={handleCancelOrder}
        confirmLoading={cancelLoading}
        onCancel={() => setModalVisible(false)}
        okText="Yes, Cancel Order"
        cancelText="Keep Order"
        okButtonProps={{ danger: true }}
      >
        <p>Are you sure you want to cancel this order?</p>
        <p>This action cannot be undone.</p>
      </Modal>
    </div>
  );
};

export default OrdersPage;
