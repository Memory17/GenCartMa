import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Typography,
  Input,
  Modal,
  Form,
  Switch,
  message,
  Tag,
  Spin,
  Alert,
  Drawer,
  Descriptions,
  List,
  Avatar,
  Divider,
  Tabs
} from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  EditOutlined,
  UserOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  HomeOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        const response = await fetch('http://localhost:8000/api/users/', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }

        const data = await response.json();
        setUsers(data.results);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching users:', error);
        setError(error.message);
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Show user details
  const showUserDetails = (user) => {
    setSelectedUser(user);
    setDrawerVisible(true);
  };

  // Show edit user modal
  const showEditModal = (user) => {
    setEditingUser(user);
    form.setFieldsValue({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone_number: user.phone_number,
      is_active: user.is_active,
      is_staff: user.is_staff,
    });
    setModalVisible(true);
  };

  // Handle update user
  const handleUpdateUser = async () => {
    try {
      const values = await form.validateFields();
      
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`http://localhost:8000/api/users/${editingUser.id}/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error('Failed to update user');
      }

      message.success('User updated successfully');
      setModalVisible(false);
      
      // Update user in state
      const updatedUser = await response.json();
      setUsers(users.map(user => 
        user.id === updatedUser.id ? updatedUser : user
      ));

      // If the drawer is open and showing this user, update it there too
      if (selectedUser && selectedUser.id === updatedUser.id) {
        setSelectedUser(updatedUser);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      message.error(error.message || 'Failed to update user');
    }
  };

  // Filter users by search text
  const filteredUsers = users.filter(user => {
    const searchLower = searchText.toLowerCase();
    return (
      user.username.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      (user.first_name && user.first_name.toLowerCase().includes(searchLower)) ||
      (user.last_name && user.last_name.toLowerCase().includes(searchLower))
    );
  });

  // Table columns
  const columns = [
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
      sorter: (a, b) => a.username.localeCompare(b.username),
    },
    {
      title: 'Name',
      key: 'name',
      render: (_, record) => `${record.first_name || ''} ${record.last_name || ''}`.trim() || 'N/A',
      sorter: (a, b) => {
        const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim();
        const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim();
        return nameA.localeCompare(nameB);
      },
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      sorter: (a, b) => a.email.localeCompare(b.email),
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'status',
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'ACTIVE' : 'INACTIVE'}
        </Tag>
      ),
      filters: [
        { text: 'Active', value: true },
        { text: 'Inactive', value: false },
      ],
      onFilter: (value, record) => record.is_active === value,
    },
    {
      title: 'Role',
      key: 'role',
      render: (_, record) => {
        if (record.is_superuser) return <Tag color="gold">SUPERUSER</Tag>;
        if (record.is_staff) return <Tag color="blue">STAFF</Tag>;
        return <Tag color="default">CUSTOMER</Tag>;
      },
      filters: [
        { text: 'Superuser', value: 'superuser' },
        { text: 'Staff', value: 'staff' },
        { text: 'Customer', value: 'customer' },
      ],
      onFilter: (value, record) => {
        if (value === 'superuser') return record.is_superuser;
        if (value === 'staff') return record.is_staff && !record.is_superuser;
        return !record.is_staff && !record.is_superuser;
      },
    },
    {
      title: 'Joined',
      dataIndex: 'date_joined',
      key: 'date_joined',
      render: (date) => new Date(date).toLocaleDateString(),
      sorter: (a, b) => new Date(a.date_joined) - new Date(b.date_joined),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => showUserDetails(record)}
          />
          <Button
            type="default"
            icon={<EditOutlined />}
            size="small"
            onClick={() => showEditModal(record)}
          />
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <p>Loading users...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error"
        description={`Failed to load users: ${error}`}
        type="error"
        showIcon
      />
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={2}>Users</Title>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Input
          placeholder="Search users by username, email, or name"
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          style={{ width: 400 }}
        />
      </div>

      <Table
        columns={columns}
        dataSource={filteredUsers.map(user => ({ ...user, key: user.id }))}
        pagination={{ pageSize: 10 }}
      />

      {/* User Details Drawer */}
      <Drawer
        title={selectedUser ? `User: ${selectedUser.username}` : 'User Details'}
        placement="right"
        width={600}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
      >
        {selectedUser && (
          <Tabs defaultActiveKey="1">
            <TabPane tab="Profile" key="1">
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <Avatar 
                  size={100} 
                  icon={<UserOutlined />} 
                  src={selectedUser.avatar_url}
                />
                <Title level={4} style={{ marginTop: 16, marginBottom: 0 }}>
                  {`${selectedUser.first_name || ''} ${selectedUser.last_name || ''}`.trim() || selectedUser.username}
                </Title>
                <Text type="secondary">{selectedUser.email}</Text>
              </div>

              <Descriptions bordered column={1}>
                <Descriptions.Item label="Username">{selectedUser.username}</Descriptions.Item>
                <Descriptions.Item label="Email">{selectedUser.email}</Descriptions.Item>
                <Descriptions.Item label="Phone">
                  {selectedUser.phone_number || 'Not provided'}
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag color={selectedUser.is_active ? 'green' : 'red'}>
                    {selectedUser.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Role">
                  {selectedUser.is_superuser ? (
                    <Tag color="gold">SUPERUSER</Tag>
                  ) : selectedUser.is_staff ? (
                    <Tag color="blue">STAFF</Tag>
                  ) : (
                    <Tag color="default">CUSTOMER</Tag>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Date Joined">
                  {new Date(selectedUser.date_joined).toLocaleString()}
                </Descriptions.Item>
              </Descriptions>

              <div style={{ marginTop: 16, textAlign: 'right' }}>
                <Button
                  type="primary"
                  onClick={() => showEditModal(selectedUser)}
                >
                  Edit User
                </Button>
              </div>
            </TabPane>

            <TabPane tab="Addresses" key="2">
              {selectedUser.addresses && selectedUser.addresses.length > 0 ? (
                <List
                  itemLayout="vertical"
                  dataSource={selectedUser.addresses}
                  renderItem={address => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={<Avatar icon={<HomeOutlined />} />}
                        title={`${address.address_type.toUpperCase()} Address ${address.default ? '(Default)' : ''}`}
                        description={
                          <>
                            {address.street_address}
                            {address.apartment_address && <>, {address.apartment_address}</>}
                            <br />
                            {address.city}, {address.state} {address.zip_code}
                            <br />
                            {address.country}
                          </>
                        }
                      />
                    </List.Item>
                  )}
                />
              ) : (
                <Empty description="No addresses found" />
              )}
            </TabPane>

            <TabPane tab="Orders" key="3">
              <Alert
                message="Orders"
                description="View user's orders in the Orders section"
                type="info"
                showIcon
              />
            </TabPane>
          </Tabs>
        )}
      </Drawer>

      {/* Edit User Modal */}
      <Modal
        title="Edit User"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setModalVisible(false)}>
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            onClick={handleUpdateUser}
          >
            Update
          </Button>,
        ]}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="first_name"
            label="First Name"
          >
            <Input prefix={<UserOutlined />} />
          </Form.Item>

          <Form.Item
            name="last_name"
            label="Last Name"
          >
            <Input prefix={<UserOutlined />} />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { type: 'email', message: 'Please enter a valid email' },
              { required: true, message: 'Please enter email' }
            ]}
          >
            <Input prefix={<MailOutlined />} />
          </Form.Item>

          <Form.Item
            name="phone_number"
            label="Phone Number"
          >
            <Input prefix={<PhoneOutlined />} />
          </Form.Item>

          <Form.Item
            name="is_active"
            label="Active"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="is_staff"
            label="Staff Status"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminUsers;
