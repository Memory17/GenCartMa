import React, { useState, useEffect } from "react";
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Typography,
  Tag,
  Spin,
  Drawer,
  Descriptions,
  Switch,
  Popconfirm,
  Tabs,
} from "antd";
import {
  UserOutlined,
  EditOutlined,
  EyeOutlined,
  LockOutlined,
  DeleteOutlined,
  MailOutlined,
  PhoneOutlined,
  ShoppingOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userOrders, setUserOrders] = useState([]);
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("access_token");
        const response = await fetch("http://localhost:8000/api/users/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Failed to fetch users");
        const data = await response.json();
        setUsers(data.results || data || []);
      } catch (error) {
        console.error("Error fetching users:", error);
        message.error("Failed to load users");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  // Show user details
  const showUserDetails = async (user) => {
    setSelectedUser(user);
    setDrawerVisible(true);
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(
        `http://localhost:8000/api/orders/?user=${user.id}`,
        {
          // backend lacks user orders endpoint; filter via query if supported
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch user orders");
      const data = await response.json();
      setUserOrders(data.results || data || []);
    } catch (error) {
      console.error("Error fetching user orders:", error);
      message.error("Failed to load user orders");
    }
  };

  // Show edit user modal
  const showEditModal = (user) => {
    setSelectedUser(user);
    form.setFieldsValue({
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      is_active: user.is_active,
      is_staff: user.is_staff,
      is_superuser: user.is_superuser,
    });
    setModalVisible(true);
  };

  // Show change password modal
  const showPasswordModal = (user) => {
    setSelectedUser(user);
    passwordForm.resetFields();
    setPasswordModalVisible(true);
  };

  // Handle user update
  const handleUpdateUser = async (values) => {
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(
        `http://localhost:8000/api/users/${selectedUser.id}/`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        }
      );
      if (!response.ok) throw new Error("Failed to update user");
      const updatedUser = await response.json();
      message.success("User updated successfully");
      setModalVisible(false);
      setUsers(users.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
      if (drawerVisible) setSelectedUser(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      message.error("Failed to update user");
    }
  };

  // Handle password change
  const handleChangePassword = async (values) => {
    try {
      const token = localStorage.getItem("access_token");
      // As admin, bypass by sending placeholders for old/confirm if not provided
      const payload = {
        old_password: values.old_password || "TEMP_PLACEHOLDER",
        new_password: values.password,
        confirm_password: values.confirm || values.password,
      };
      const response = await fetch(
        `http://localhost:8000/api/users/${selectedUser.id}/change_password/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );
      if (!response.ok) throw new Error("Failed to change password");
      message.success("Password changed successfully");
      setPasswordModalVisible(false);
    } catch (error) {
      console.error("Error changing password:", error);
      message.error("Failed to change password");
    }
  };

  // Handle user deletion
  const handleDeleteUser = async (userId) => {
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(
        `http://localhost:8000/api/users/${userId}/`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!response.ok) throw new Error("Failed to delete user");
      message.success("User deleted successfully");
      setUsers(users.filter((user) => user.id !== userId));
      if (drawerVisible && selectedUser && selectedUser.id === userId) {
        setDrawerVisible(false);
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      message.error("Failed to delete user");
    }
  };

  // Get status tag
  const getUserStatusTag = (user) => {
    if (user.is_superuser) return <Tag color="gold">Superuser</Tag>;
    if (user.is_staff) return <Tag color="blue">Staff</Tag>;
    return <Tag color="green">Customer</Tag>;
  };

  // Table columns
  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      sorter: (a, b) => a.id - b.id,
    },
    {
      title: "Username",
      dataIndex: "username",
      key: "username",
      sorter: (a, b) => a.username.localeCompare(b.username),
    },
    {
      title: "Name",
      key: "name",
      render: (_, record) => `${record.first_name} ${record.last_name}`,
      sorter: (a, b) =>
        `${a.first_name} ${a.last_name}`.localeCompare(
          `${b.first_name} ${b.last_name}`
        ),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Role",
      key: "role",
      render: (_, record) => getUserStatusTag(record),
      filters: [
        { text: "Superuser", value: "superuser" },
        { text: "Staff", value: "staff" },
        { text: "Customer", value: "customer" },
      ],
      onFilter: (value, record) => {
        if (value === "superuser") return record.is_superuser;
        if (value === "staff") return record.is_staff && !record.is_superuser;
        return !record.is_staff && !record.is_superuser;
      },
    },
    {
      title: "Active",
      dataIndex: "is_active",
      key: "is_active",
      render: (active) => <Switch checked={active} disabled />,
      filters: [
        { text: "Active", value: true },
        { text: "Inactive", value: false },
      ],
      onFilter: (value, record) => record.is_active === value,
    },
    {
      title: "Date Joined",
      dataIndex: "date_joined",
      key: "date_joined",
      render: (text) => new Date(text).toLocaleDateString("en-IN"),
      sorter: (a, b) => new Date(a.date_joined) - new Date(b.date_joined),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            icon={<EyeOutlined />}
            onClick={() => showUserDetails(record)}
            size="small"
          />
          <Button
            type="default"
            icon={<EditOutlined />}
            onClick={() => showEditModal(record)}
            size="small"
          />
          <Button
            type="default"
            icon={<LockOutlined />}
            onClick={() => showPasswordModal(record)}
            size="small"
          />
          <Popconfirm
            title="Are you sure you want to delete this user?"
            onConfirm={() => handleDeleteUser(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="primary"
              danger
              icon={<DeleteOutlined />}
              size="small"
              disabled={record.is_superuser} // Prevent deleting superusers
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Order columns for user details
  const orderColumns = [
    {
      title: "Order ID",
      dataIndex: "id",
      key: "id",
    },
    {
      title: "Date",
      dataIndex: "created_at",
      key: "created_at",
      render: (text) => new Date(text).toLocaleDateString("en-IN"),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        let color = "default";
        if (status === "processing") color = "blue";
        if (status === "shipped") color = "cyan";
        if (status === "delivered") color = "green";
        if (status === "cancelled") color = "red";

        return <Tag color={color}>{status.toUpperCase()}</Tag>;
      },
    },
    {
      title: "Total",
      dataIndex: "total_amount",
      key: "total_amount",
      render: (text) => `₫${parseFloat(text).toFixed(2)}`,
    },
  ];

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <Title level={2}>Users</Title>

      <Table
        columns={columns}
        dataSource={users}
        rowKey="id"
        pagination={{ pageSize: 10 }}
      />

      {/* Edit User Modal */}
      <Modal
        title="Edit User"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleUpdateUser}>
          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: "Please enter username" }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Username" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: "Please enter email" },
              { type: "email", message: "Please enter a valid email" },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="Email" />
          </Form.Item>

          <Form.Item name="first_name" label="First Name">
            <Input placeholder="First Name" />
          </Form.Item>

          <Form.Item name="last_name" label="Last Name">
            <Input placeholder="Last Name" />
          </Form.Item>

          <Form.Item name="is_active" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item
            name="is_staff"
            label="Staff Status"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="is_superuser"
            label="Superuser Status"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button
                style={{ marginRight: 8 }}
                onClick={() => setModalVisible(false)}
              >
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                Update User
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        title="Change Password"
        open={passwordModalVisible}
        onCancel={() => setPasswordModalVisible(false)}
        footer={null}
      >
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handleChangePassword}
        >
          <Form.Item
            name="password"
            label="New Password"
            rules={[
              { required: true, message: "Please enter new password" },
              { min: 8, message: "Password must be at least 8 characters" },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="New Password"
            />
          </Form.Item>

          <Form.Item
            name="confirm"
            label="Confirm Password"
            dependencies={["password"]}
            rules={[
              { required: true, message: "Please confirm password" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error("The two passwords do not match")
                  );
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Confirm Password"
            />
          </Form.Item>

          <Form.Item>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button
                style={{ marginRight: 8 }}
                onClick={() => setPasswordModalVisible(false)}
              >
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                Change Password
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* User Details Drawer */}
      <Drawer
        title={`User: ${selectedUser?.username || ""}`}
        placement="right"
        width={600}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        extra={
          <Space>
            <Button
              type="primary"
              onClick={() => {
                setDrawerVisible(false);
                showEditModal(selectedUser);
              }}
            >
              Edit User
            </Button>
          </Space>
        }
      >
        {selectedUser && (
          <Tabs defaultActiveKey="1">
            <TabPane tab="User Information" key="1">
              <Descriptions bordered column={1}>
                <Descriptions.Item label="ID">
                  {selectedUser.id}
                </Descriptions.Item>
                <Descriptions.Item label="Username">
                  {selectedUser.username}
                </Descriptions.Item>
                <Descriptions.Item label="Email">
                  {selectedUser.email}
                </Descriptions.Item>
                <Descriptions.Item label="First Name">
                  {selectedUser.first_name || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Last Name">
                  {selectedUser.last_name || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Date Joined">
                  {new Date(selectedUser.date_joined).toLocaleString("en-IN")}
                </Descriptions.Item>
                <Descriptions.Item label="Last Login">
                  {selectedUser.last_login
                    ? new Date(selectedUser.last_login).toLocaleString("en-IN")
                    : "Never"}
                </Descriptions.Item>
                <Descriptions.Item label="Active">
                  <Switch checked={selectedUser.is_active} disabled />
                </Descriptions.Item>
                <Descriptions.Item label="Staff Status">
                  <Switch checked={selectedUser.is_staff} disabled />
                </Descriptions.Item>
                <Descriptions.Item label="Superuser Status">
                  <Switch checked={selectedUser.is_superuser} disabled />
                </Descriptions.Item>
              </Descriptions>
            </TabPane>
            <TabPane tab="Orders" key="2">
              <Table
                columns={orderColumns}
                dataSource={userOrders}
                rowKey="id"
                pagination={{ pageSize: 5 }}
              />
            </TabPane>
          </Tabs>
        )}
      </Drawer>
    </div>
  );
};

export default AdminUsers;
