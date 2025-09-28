import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography,
  Card,
  Avatar,
  Form,
  Input,
  Button,
  Row,
  Col,
  Tabs,
  Upload,
  message,
  Spin,
  Space,
  Badge,
  Progress,
  Tooltip,
  Divider
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  HomeOutlined,
  PhoneOutlined,
  EditOutlined,
  SaveOutlined,
  UploadOutlined,
  LockOutlined,
  CameraOutlined,
  CheckCircleOutlined,
  SafetyOutlined,
  EnvironmentOutlined,
  GlobalOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

const ProfilePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState({
    id: null,
    name: '',
    email: '',
    phone: '',
    avatar: null,
    addresses: [],
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      pincode: '',
      country: ''
    }
  });
  const [editMode, setEditMode] = useState(false);
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [uploadLoading, setUploadLoading] = useState(false);

  // Fetch real user data from the API
  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      try {
        // Get token from localStorage
        const token = localStorage.getItem('access_token');

        if (!token) {
          // Redirect to login if not authenticated
          message.error('Please login to view your profile');
          navigate('/login');
          return;
        }

        // Fetch user data from API
        const response = await fetch('http://localhost:8000/api/users/me/', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }

        const userData = await response.json();

        // Get default address if available
        let defaultAddress = null;
        if (userData.addresses && userData.addresses.length > 0) {
          defaultAddress = userData.addresses.find(addr => addr.default) || userData.addresses[0];
        }

        // Format user data for our component
        const formattedUserData = {
          id: userData.id,
          name: `${userData.first_name} ${userData.last_name}`.trim() || userData.username,
          email: userData.email,
          phone: userData.phone_number || '',
          avatar_url: userData.avatar_url, // Use the avatar_url from the API
          addresses: userData.addresses || [],
          address: defaultAddress ? {
            line1: defaultAddress.street_address || '',
            line2: defaultAddress.apartment_address || '',
            city: defaultAddress.city || '',
            state: defaultAddress.state || '',
            pincode: defaultAddress.zip_code || '',
            country: defaultAddress.country || ''
          } : {
            line1: '',
            line2: '',
            city: '',
            state: '',
            pincode: '',
            country: ''
          }
        };

        setUserData(formattedUserData);
        form.setFieldsValue({
          name: formattedUserData.name,
          email: formattedUserData.email,
          phone: formattedUserData.phone,
          addressLine1: formattedUserData.address.line1,
          addressLine2: formattedUserData.address.line2,
          city: formattedUserData.address.city,
          state: formattedUserData.address.state,
          pincode: formattedUserData.address.pincode,
          country: formattedUserData.address.country
        });
      } catch (error) {
        console.error('Error fetching user data:', error);
        message.error('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [form, navigate]);

  // Handle form submission
  const handleSubmit = async (values) => {
    setLoading(true);

    try {
      // Get token from localStorage
      const token = localStorage.getItem('access_token');

      if (!token) {
        message.error('Authentication error. Please login again.');
        navigate('/login');
        return;
      }

      // Split name into first_name and last_name
      let firstName = '';
      let lastName = '';

      if (values.name) {
        const nameParts = values.name.split(' ');
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
      }

      // Update user profile
      const userResponse = await fetch(`http://localhost:8000/api/users/${userData.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email: values.email,
          phone_number: values.phone
        }),
      });

      if (!userResponse.ok) {
        throw new Error('Failed to update profile');
      }

      // Check if user has an address
      let addressId = null;
      let addressMethod = 'POST';
      let addressUrl = 'http://localhost:8000/api/addresses/';

      // Get updated user data to check for addresses
      const userDataResponse = await fetch('http://localhost:8000/api/users/me/', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!userDataResponse.ok) {
        throw new Error('Failed to fetch user data');
      }

      const currentUserData = await userDataResponse.json();

      if (currentUserData.addresses && currentUserData.addresses.length > 0) {
        // Update existing address
        addressId = currentUserData.addresses[0].id;
        addressMethod = 'PUT';
        addressUrl = `http://localhost:8000/api/addresses/${addressId}/`;
      }

      // Update or create address
      const addressResponse = await fetch(addressUrl, {
        method: addressMethod,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          address_type: 'shipping',
          street_address: values.addressLine1,
          apartment_address: values.addressLine2,
          city: values.city,
          state: values.state,
          country: values.country,
          zip_code: values.pincode,
          default: true
        }),
      });

      if (!addressResponse.ok) {
        throw new Error('Failed to update address');
      }

      // Refresh user data
      const updatedUserResponse = await fetch('http://localhost:8000/api/users/me/', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!updatedUserResponse.ok) {
        throw new Error('Failed to fetch updated user data');
      }

      const updatedUserData = await updatedUserResponse.json();

      // Get default address if available
      let defaultAddress = null;
      if (updatedUserData.addresses && updatedUserData.addresses.length > 0) {
        defaultAddress = updatedUserData.addresses.find(addr => addr.default) || updatedUserData.addresses[0];
      }

      // Format user data for our component
      const formattedUserData = {
        id: updatedUserData.id,
        name: `${updatedUserData.first_name} ${updatedUserData.last_name}`.trim() || updatedUserData.username,
        email: updatedUserData.email,
        phone: updatedUserData.phone_number || '',
        avatar: null,
        addresses: updatedUserData.addresses || [],
        address: defaultAddress ? {
          line1: defaultAddress.street_address || '',
          line2: defaultAddress.apartment_address || '',
          city: defaultAddress.city || '',
          state: defaultAddress.state || '',
          pincode: defaultAddress.zip_code || '',
          country: defaultAddress.country || ''
        } : {
          line1: '',
          line2: '',
          city: '',
          state: '',
          pincode: '',
          country: ''
        }
      };

      setUserData(formattedUserData);
      setEditMode(false);
      message.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      message.error('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle password change
  const handlePasswordChange = async (values) => {
    setLoading(true);

    try {
      // Get token from localStorage
      const token = localStorage.getItem('access_token');

      if (!token) {
        message.error('Authentication error. Please login again.');
        navigate('/login');
        return;
      }

      // Change password
      const response = await fetch(`http://localhost:8000/api/users/${userData.id}/change_password/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          old_password: values.currentPassword,
          new_password: values.newPassword,
          confirm_password: values.confirmPassword
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to change password');
      }

      passwordForm.resetFields();
      message.success('Password changed successfully!');

      // Optionally, you can log the user out and redirect to login page
      // This is a good practice after password change
      const logoutAfterPasswordChange = window.confirm(
        'Your password has been changed successfully. For security reasons, would you like to log out and log in again with your new password?'
      );

      if (logoutAfterPasswordChange) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        message.info('Please log in with your new password');
        navigate('/login');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      message.error(error.message || 'Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle avatar upload
  const handleAvatarUpload = async (info) => {
    if (info.file.status === 'uploading') {
      setUploadLoading(true);
      return;
    }

    if (info.file.status === 'done') {
      try {
        // Get token from localStorage
        const token = localStorage.getItem('access_token');

        if (!token) {
          message.error('Authentication error. Please login again.');
          navigate('/login');
          return;
        }

        // Create form data for file upload
        const formData = new FormData();
        formData.append('avatar', info.file.originFileObj);

        // Upload avatar
        const response = await fetch(`http://localhost:8000/api/users/${userData.id}/upload_avatar/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Failed to upload avatar');
        }

        const data = await response.json();

        // Update user data with new avatar URL
        setUserData({
          ...userData,
          avatar_url: data.avatar_url
        });

        message.success('Avatar uploaded successfully!');
      } catch (error) {
        console.error('Error uploading avatar:', error);
        message.error('Failed to upload avatar. Please try again.');
      } finally {
        setUploadLoading(false);
      }
    }
  };

  // Calculate profile completion percentage
  const calculateProfileCompletion = () => {
    const fields = [
      userData.name,
      userData.email,
      userData.phone,
      userData.address.line1,
      userData.address.city,
      userData.address.state,
      userData.address.pincode,
      userData.avatar_url
    ];
    const filledFields = fields.filter(field => field && field.trim() !== '').length;
    return Math.round((filledFields / fields.length) * 100);
  };

  // Render profile information in view mode
  const renderProfileInfo = () => (
    <div style={{ padding: '0' }}>
      {/* Profile Header */}
      <Card
        style={{
          marginBottom: '24px',
          borderRadius: '16px',
          border: 'none',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          overflow: 'hidden'
        }}
      >
        <Row gutter={[32, 32]} align="middle">
          {/* Avatar Section */}
          <Col xs={24} md={8} style={{ textAlign: 'center' }}>
            <div style={{ display: 'inline-block', position: 'relative' }}>
              <Upload
                name="avatar"
                listType="picture-card"
                className="avatar-uploader"
                showUploadList={false}
                customRequest={({ onSuccess }) => {
                  setTimeout(() => onSuccess("ok"), 0);
                }}
                beforeUpload={(file) => {
                  const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
                  if (!isJpgOrPng) {
                    message.error('You can only upload JPG/PNG files!');
                  }
                  const isLt2M = file.size / 1024 / 1024 < 2;
                  if (!isLt2M) {
                    message.error('Image must be smaller than 2MB!');
                  }
                  return isJpgOrPng && isLt2M;
                }}
                onChange={handleAvatarUpload}
              >
                {userData.avatar_url ? (
                  <div style={{ position: 'relative' }}>
                    <Avatar
                      src={userData.avatar_url}
                      size={120}
                      style={{
                        border: '4px solid #f0f0f0',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '5px',
                        right: '5px',
                        background: '#1677ff',
                        borderRadius: '50%',
                        width: '28px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        cursor: 'pointer'
                      }}
                    >
                      <CameraOutlined style={{ color: 'white', fontSize: '12px' }} />
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      width: '120px',
                      height: '120px',
                      border: '2px dashed #d9d9d9',
                      borderRadius: '50%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#fafafa',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {uploadLoading ? (
                      <Spin />
                    ) : (
                      <>
                        <CameraOutlined style={{ fontSize: '24px', color: '#1677ff', marginBottom: '8px' }} />
                        <Text style={{ color: '#1677ff', fontSize: '12px' }}>
                          Upload Photo
                        </Text>
                      </>
                    )}
                  </div>
                )}
              </Upload>
              
              {/* Profile Completion */}
              <div style={{ marginTop: '16px' }}>
                <Text style={{ fontSize: '12px', color: '#8c8c8c', display: 'block', marginBottom: '8px' }}>
                  Profile Completion
                </Text>
                <Progress
                  percent={calculateProfileCompletion()}
                  size="small"
                  strokeColor={{
                    '0%': '#1677ff',
                    '100%': '#52c41a',
                  }}
                />
              </div>
            </div>
          </Col>

          {/* User Info Section */}
          <Col xs={24} md={16}>
            <div>
              <Title level={2} style={{ marginBottom: '8px', color: '#262626' }}>
                {userData.name || 'Welcome!'}
              </Title>
              <Text style={{ color: '#8c8c8c', fontSize: '16px', display: 'block', marginBottom: '24px' }}>
                Manage your account and personal information
              </Text>

              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <div style={{ 
                    padding: '16px', 
                    background: '#f8f9fa', 
                    borderRadius: '8px',
                    border: '1px solid #e8e9ea'
                  }}>
                    <Space>
                      <MailOutlined style={{ color: '#1677ff' }} />
                      <div>
                        <Text style={{ fontSize: '12px', color: '#8c8c8c', display: 'block' }}>Email</Text>
                        <Text style={{ fontSize: '14px', fontWeight: '500' }}>{userData.email}</Text>
                      </div>
                    </Space>
                  </div>
                </Col>
                
                <Col xs={24} sm={12}>
                  <div style={{ 
                    padding: '16px', 
                    background: '#f8f9fa', 
                    borderRadius: '8px',
                    border: '1px solid #e8e9ea'
                  }}>
                    <Space>
                      <PhoneOutlined style={{ color: '#1677ff' }} />
                      <div>
                        <Text style={{ fontSize: '12px', color: '#8c8c8c', display: 'block' }}>Phone</Text>
                        <Text style={{ fontSize: '14px', fontWeight: '500' }}>
                          {userData.phone || 'Add phone number'}
                        </Text>
                      </div>
                    </Space>
                  </div>
                </Col>
              </Row>

              <div style={{ marginTop: '24px' }}>
                <Button
                  type="primary"
                  size="large"
                  icon={<EditOutlined />}
                  onClick={() => setEditMode(true)}
                  style={{
                    borderRadius: '8px',
                    height: '44px',
                    fontWeight: '600'
                  }}
                >
                  Edit Profile
                </Button>
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Address Information */}
      <Card
        title={
          <Space>
            <HomeOutlined style={{ color: '#1677ff' }} />
            <span>Address Information</span>
          </Space>
        }
        style={{
          borderRadius: '16px',
          border: 'none',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
        }}
        headStyle={{
          borderBottom: '1px solid #f0f0f0',
          fontSize: '16px',
          fontWeight: '600'
        }}
      >
        {userData.address.line1 ? (
          <div>
            <div style={{ marginBottom: '12px' }}>
              <Text strong style={{ fontSize: '16px', display: 'block' }}>
                {userData.address.line1}
              </Text>
              {userData.address.line2 && (
                <Text style={{ color: '#8c8c8c', fontSize: '14px' }}>
                  {userData.address.line2}
                </Text>
              )}
            </div>
            <div style={{ marginBottom: '8px' }}>
              <Text style={{ fontSize: '14px' }}>
                {userData.address.city}, {userData.address.state} {userData.address.pincode}
              </Text>
            </div>
            <div>
              <Space>
                <GlobalOutlined style={{ color: '#1677ff' }} />
                <Text style={{ fontSize: '14px', fontWeight: '500' }}>
                  {userData.address.country}
                </Text>
              </Space>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <EnvironmentOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
            <Paragraph style={{ color: '#8c8c8c', fontSize: '14px' }}>
              No address information available. Click "Edit Profile" to add your address.
            </Paragraph>
          </div>
        )}
      </Card>
    </div>
  );

  // Render edit form
  const renderEditForm = () => (
    <div style={{ padding: '0' }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          addressLine1: userData.address.line1,
          addressLine2: userData.address.line2,
          city: userData.address.city,
          state: userData.address.state,
          pincode: userData.address.pincode,
          country: userData.address.country
        }}
      >
        {/* Personal Information */}
        <Card 
          title="Personal Information"
          style={{ 
            marginBottom: '24px', 
            borderRadius: '16px',
            border: 'none',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
          }}
          headStyle={{
            borderBottom: '1px solid #f0f0f0',
            fontSize: '16px',
            fontWeight: '600'
          }}
        >
          <Row gutter={[24, 16]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="name"
                label="Full Name"
                rules={[{ required: true, message: 'Please enter your name' }]}
              >
                <Input 
                  prefix={<UserOutlined style={{ color: '#1677ff' }} />} 
                  placeholder="John Doe"
                  size="large"
                  style={{ borderRadius: '8px' }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="email"
                label="Email Address"
                rules={[
                  { required: true, message: 'Please enter your email' },
                  { type: 'email', message: 'Please enter a valid email' }
                ]}
              >
                <Input 
                  prefix={<MailOutlined style={{ color: '#1677ff' }} />} 
                  placeholder="john.doe@example.com"
                  size="large"
                  style={{ borderRadius: '8px' }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="phone"
                label="Phone Number"
                rules={[{ required: true, message: 'Please enter your phone number' }]}
              >
                <Input 
                  prefix={<PhoneOutlined style={{ color: '#1677ff' }} />} 
                  placeholder="+84 123 456 789"
                  size="large"
                  style={{ borderRadius: '8px' }}
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Address Information */}
        <Card 
          title="Address Information"
          style={{ 
            marginBottom: '24px', 
            borderRadius: '16px',
            border: 'none',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
          }}
          headStyle={{
            borderBottom: '1px solid #f0f0f0',
            fontSize: '16px',
            fontWeight: '600'
          }}
        >
          <Row gutter={[24, 16]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="addressLine1"
                label="Address Line 1"
                rules={[{ required: true, message: 'Please enter your address' }]}
              >
                <Input 
                  prefix={<HomeOutlined style={{ color: '#1677ff' }} />} 
                  placeholder="123 Main Street"
                  size="large"
                  style={{ borderRadius: '8px' }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="addressLine2"
                label="Address Line 2 (Optional)"
              >
                <Input 
                  placeholder="Apartment, suite, etc."
                  size="large"
                  style={{ borderRadius: '8px' }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="city"
                label="City"
                rules={[{ required: true, message: 'Please enter your city' }]}
              >
                <Input 
                  placeholder="Ho Chi Minh City"
                  size="large"
                  style={{ borderRadius: '8px' }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="state"
                label="State/Province"
                rules={[{ required: true, message: 'Please enter your state' }]}
              >
                <Input 
                  placeholder="Ho Chi Minh"
                  size="large"
                  style={{ borderRadius: '8px' }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="pincode"
                label="Postal Code"
                rules={[{ required: true, message: 'Please enter your postal code' }]}
              >
                <Input 
                  placeholder="700000"
                  size="large"
                  style={{ borderRadius: '8px' }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="country"
                label="Country"
                rules={[{ required: true, message: 'Please enter your country' }]}
              >
                <Input 
                  prefix={<GlobalOutlined style={{ color: '#1677ff' }} />}
                  placeholder="Vietnam"
                  size="large"
                  style={{ borderRadius: '8px' }}
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Action Buttons */}
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <Space size="middle">
            <Button 
              type="primary" 
              htmlType="submit" 
              icon={<SaveOutlined />}
              size="large"
              loading={loading}
              style={{
                borderRadius: '8px',
                height: '44px',
                padding: '0 32px',
                fontWeight: '600'
              }}
            >
              Save Changes
            </Button>
            <Button
              onClick={() => setEditMode(false)}
              size="large"
              style={{
                borderRadius: '8px',
                height: '44px',
                padding: '0 32px'
              }}
            >
              Cancel
            </Button>
          </Space>
        </div>
      </Form>
    </div>
  );

  // Render password change form
  const renderPasswordForm = () => (
    <div style={{ padding: '0' }}>
      <Card
        title={
          <Space>
            <SafetyOutlined style={{ color: '#1677ff' }} />
            <span>Change Password</span>
          </Space>
        }
        style={{
          borderRadius: '16px',
          border: 'none',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
        }}
        headStyle={{
          borderBottom: '1px solid #f0f0f0',
          fontSize: '16px',
          fontWeight: '600'
        }}
      >
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handlePasswordChange}
        >
          {/* Security Notice */}
          <div style={{ 
            background: '#fff7e6',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '24px',
            border: '1px solid #ffe58f'
          }}>
            <Space>
              <LockOutlined style={{ color: '#d48806' }} />
              <div>
                <Text strong style={{ color: '#d48806', fontSize: '14px' }}>Security Notice</Text>
                <Text style={{ display: 'block', color: '#d48806', fontSize: '12px' }}>
                  For your security, please enter your current password and choose a strong new password.
                </Text>
              </div>
            </Space>
          </div>

          <Row gutter={[24, 16]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="currentPassword"
                label="Current Password"
                rules={[{ required: true, message: 'Please enter your current password' }]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: '#1677ff' }} />}
                  placeholder="Enter current password"
                  size="large"
                  style={{ borderRadius: '8px' }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[24, 16]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="newPassword"
                label="New Password"
                rules={[
                  { required: true, message: 'Please enter your new password' },
                  { min: 8, message: 'Password must be at least 8 characters' }
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: '#1677ff' }} />}
                  placeholder="Enter new password"
                  size="large"
                  style={{ borderRadius: '8px' }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="confirmPassword"
                label="Confirm New Password"
                dependencies={['newPassword']}
                rules={[
                  { required: true, message: 'Please confirm your new password' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('The two passwords do not match'));
                    },
                  }),
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: '#1677ff' }} />}
                  placeholder="Confirm new password"
                  size="large"
                  style={{ borderRadius: '8px' }}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Password Requirements */}
          <div style={{
            background: '#f6ffed',
            border: '1px solid #b7eb8f',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <Text strong style={{ color: '#52c41a', fontSize: '14px', display: 'block', marginBottom: '8px' }}>
              Password Requirements:
            </Text>
            <ul style={{ color: '#52c41a', margin: '0', paddingLeft: '20px' }}>
              <li style={{ fontSize: '12px', marginBottom: '4px' }}>At least 8 characters long</li>
              <li style={{ fontSize: '12px', marginBottom: '4px' }}>Mix of uppercase and lowercase letters</li>
              <li style={{ fontSize: '12px', marginBottom: '4px' }}>At least one number</li>
              <li style={{ fontSize: '12px' }}>At least one special character</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div style={{ textAlign: 'center' }}>
            <Space size="middle">
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                size="large"
                loading={loading}
                style={{
                  borderRadius: '8px',
                  height: '44px',
                  padding: '0 32px',
                  fontWeight: '600'
                }}
              >
                Update Password
              </Button>
              <Button
                onClick={() => passwordForm.resetFields()}
                size="large"
                style={{
                  borderRadius: '8px',
                  height: '44px',
                  padding: '0 32px'
                }}
              >
                Reset Form
              </Button>
            </Space>
          </div>
        </Form>
      </Card>
    </div>
  );

  return (
    <div style={{ 
      background: '#f5f5f5',
      minHeight: '100vh',
      padding: '24px'
    }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Page Header */}
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <Title level={1} style={{ marginBottom: '8px', color: '#262626' }}>
            My Profile
          </Title>
          <Text style={{ fontSize: '16px', color: '#8c8c8c' }}>
            Manage your account settings and personal information
          </Text>
        </div>

        {loading ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '80px',
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
          }}>
            <Spin size="large" />
            <Title level={3} style={{ marginTop: '24px', color: '#8c8c8c' }}>
              Loading Profile...
            </Title>
          </div>
        ) : (
          <Card
            style={{
              borderRadius: '16px',
              border: 'none',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              overflow: 'hidden'
            }}
          >
            <Tabs 
              defaultActiveKey="profile"
              size="large"
              tabBarStyle={{
                marginBottom: '32px',
                borderBottom: '2px solid #f0f0f0'
              }}
            >
              <TabPane 
                tab={
                  <Space>
                    <UserOutlined />
                    Profile Information
                  </Space>
                } 
                key="profile"
              >
                {editMode ? renderEditForm() : renderProfileInfo()}
              </TabPane>
              <TabPane 
                tab={
                  <Space>
                    <SafetyOutlined />
                    Security
                  </Space>
                } 
                key="security"
              >
                {renderPasswordForm()}
              </TabPane>
            </Tabs>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
