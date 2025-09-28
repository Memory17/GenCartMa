import React from 'react';
import { Typography, Row, Col, Card, Space, Divider } from 'antd';
import { ShopOutlined, SafetyOutlined, CustomerServiceOutlined, GlobalOutlined } from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

const AboutPage = () => {
  return (
    <div style={{ padding: '20px' }}>
      <Title level={2}>About NexCart</Title>
      
      <Paragraph style={{ fontSize: '16px' }}>
        Welcome to NexCart, your premier destination for online shopping. We are dedicated to providing 
        a seamless shopping experience with a wide range of high-quality products at competitive prices.
      </Paragraph>
      
      <Divider />
      
      <Title level={3}>Our Mission</Title>
      <Paragraph style={{ fontSize: '16px' }}>
        At NexCart, our mission is to revolutionize the online shopping experience by offering a 
        user-friendly platform, exceptional customer service, and a diverse selection of products 
        that cater to all your needs.
      </Paragraph>
      
      <Divider />
      
      <Title level={3}>Why Choose Us?</Title>
      <Row gutter={[24, 24]} style={{ marginTop: '20px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card 
            hoverable 
            style={{ height: '100%' }}
            cover={<ShopOutlined style={{ fontSize: '48px', padding: '24px', color: '#1677ff' }} />}
          >
            <Title level={4}>Wide Selection</Title>
            <Paragraph>
              Browse through thousands of products across multiple categories to find exactly what you need.
            </Paragraph>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={6}>
          <Card 
            hoverable 
            style={{ height: '100%' }}
            cover={<SafetyOutlined style={{ fontSize: '48px', padding: '24px', color: '#1677ff' }} />}
          >
            <Title level={4}>Secure Shopping</Title>
            <Paragraph>
              Shop with confidence knowing that your personal information and transactions are protected.
            </Paragraph>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={6}>
          <Card 
            hoverable 
            style={{ height: '100%' }}
            cover={<CustomerServiceOutlined style={{ fontSize: '48px', padding: '24px', color: '#1677ff' }} />}
          >
            <Title level={4}>Customer Support</Title>
            <Paragraph>
              Our dedicated support team is always ready to assist you with any questions or concerns.
            </Paragraph>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={6}>
          <Card 
            hoverable 
            style={{ height: '100%' }}
            cover={<GlobalOutlined style={{ fontSize: '48px', padding: '24px', color: '#1677ff' }} />}
          >
            <Title level={4}>Fast Delivery</Title>
            <Paragraph>
              Enjoy quick and reliable delivery services to get your products right to your doorstep.
            </Paragraph>
          </Card>
        </Col>
      </Row>
      
      <Divider />
      
      <Title level={3}>Contact Us</Title>
      <Paragraph style={{ fontSize: '16px' }}>
        We value your feedback and are always here to help. Feel free to reach out to us:
      </Paragraph>
      
      <Space direction="vertical" size="small">
        <Text strong>Email:</Text>
        <Text>nvj@nexcart.com</Text>
        
        <Text strong style={{ marginTop: '10px' }}>Phone:</Text>
        <Text>+91 7736458150</Text>
        
        <Text strong style={{ marginTop: '10px' }}>Address:</Text>
        <Text>Karingachira,Trippunithura</Text>
      </Space>
    </div>
  );
};

export default AboutPage;
