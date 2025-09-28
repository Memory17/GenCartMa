import React, { useState, useEffect } from "react";
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Select,
  message,
  Typography,
  Tag,
  Spin,
  Drawer,
  Descriptions,
  List,
  Avatar,
  Divider,
  Row,
  Col,
} from "antd";
import {
  EyeOutlined,
  EditOutlined,
  ShoppingOutlined,
  UserOutlined,
  HomeOutlined,
  PhoneOutlined,
  MailOutlined,
} from "@ant-design/icons";
import { getValidImageUrl } from "../../utils/imageUtils";

const { Title, Text } = Typography;
const { Option } = Select;

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [form] = Form.useForm();

  // Fetch orders
  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("access_token");

        // Fetch orders from existing endpoint
        const response = await fetch("http://localhost:8000/api/orders/", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch orders");
        }

        const data = await response.json();
        const orders = data.results || data || [];

        // Fetch users (admin will get all users)
        const usersResponse = await fetch("http://localhost:8000/api/users/", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!usersResponse.ok) {
          throw new Error("Failed to fetch users");
        }

        const usersData = await usersResponse.json();
        const users = usersData.results || usersData || [];

        const userMap = {};
        users.forEach((user) => {
          userMap[user.id] = user;
        });

        const enhancedOrders = orders.map((order) => {
          if (order.user) return order; // already serialized with user
          if (order.user_id && userMap[order.user_id]) {
            return { ...order, user: userMap[order.user_id] };
          }
          return order;
        });
        setOrders(enhancedOrders);
      } catch (error) {
        console.error("Error fetching orders:", error);
        message.error("Failed to load orders");
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  // Show order details
  const showOrderDetails = (order) => {
    setSelectedOrder(order);
    setDrawerVisible(true);
  };

  // Show edit status modal
  const showEditModal = (order) => {
    setSelectedOrder(order);
    form.setFieldsValue({
      status: order.status,
    });
    setModalVisible(true);
  };

  // Handle status update
  const handleUpdateStatus = async (values) => {
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(
        `http://localhost:8000/api/orders/${selectedOrder.id}/`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: values.status }),
        }
      );
      if (!response.ok) {
        throw new Error("Failed to update order status");
      }
      message.success("Order status updated successfully");
      setModalVisible(false);
      setOrders(
        orders.map((order) =>
          order.id === selectedOrder.id
            ? { ...order, status: values.status }
            : order
        )
      );
    } catch (error) {
      console.error("Error updating order status:", error);
      message.error("Failed to update order status");
    }
  };

  // Get status tag
  const getStatusTag = (status) => {
    let color = "default";
    if (status === "processing") color = "blue";
    if (status === "shipped") color = "cyan";
    if (status === "delivered") color = "green";
    if (status === "cancelled") color = "red";

    return <Tag color={color}>{status.toUpperCase()}</Tag>;
  };

  // Table columns
  const columns = [
    {
      title: "Order ID",
      dataIndex: "id",
      key: "id",
      sorter: (a, b) => a.id - b.id,
    },
    {
      title: "Customer",
      dataIndex: "user",
      key: "user",
      render: (user, record) => {
        if (!user && !record.user_id) return "Guest";
        if (!user && record.user_id) return `User ${record.user_id}`;

        const fullName = `${user.first_name || ""} ${
          user.last_name || ""
        }`.trim();
        return (
          <div>
            <div>
              <strong>@{user.username}</strong>
            </div>
            {fullName && (
              <div style={{ fontSize: "12px", color: "#888" }}>{fullName}</div>
            )}
          </div>
        );
      },
      sorter: (a, b) => {
        const aUsername = a.user
          ? a.user.username
          : a.user_id
          ? `User ${a.user_id}`
          : "Guest";
        const bUsername = b.user
          ? b.user.username
          : b.user_id
          ? `User ${b.user_id}`
          : "Guest";
        return aUsername.localeCompare(bUsername);
      },
    },
    {
      title: "Date",
      dataIndex: "created_at",
      key: "created_at",
      render: (text) => new Date(text).toLocaleDateString("en-IN"),
      sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => getStatusTag(status),
      filters: [
        { text: "Processing", value: "processing" },
        { text: "Shipped", value: "shipped" },
        { text: "Delivered", value: "delivered" },
        { text: "Cancelled", value: "cancelled" },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: "Total",
      dataIndex: "total_amount",
      key: "total_amount",
      render: (text) => `₫${parseFloat(text).toFixed(2)}`,
      sorter: (a, b) => parseFloat(a.total_amount) - parseFloat(b.total_amount),
    },
    {
      title: "Items",
      dataIndex: "items",
      key: "items",
      render: (items) => (items ? items.length : 0),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            icon={<EyeOutlined />}
            onClick={() => showOrderDetails(record)}
            size="small"
          />
          <Button
            type="default"
            icon={<EditOutlined />}
            onClick={() => showEditModal(record)}
            size="small"
          />
        </Space>
      ),
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
      <Title level={2}>Orders</Title>

      <Table
        columns={columns}
        dataSource={orders}
        rowKey="id"
        pagination={{ pageSize: 10 }}
      />

      {/* Edit Status Modal */}
      <Modal
        title="Update Order Status"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleUpdateStatus}>
          <Form.Item
            name="status"
            label="Status"
            rules={[{ required: true, message: "Please select a status" }]}
          >
            <Select placeholder="Select status">
              <Option value="processing">Processing</Option>
              <Option value="shipped">Shipped</Option>
              <Option value="delivered">Delivered</Option>
              <Option value="cancelled">Cancelled</Option>
            </Select>
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
                Update Status
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* Order Details Drawer */}
      <Drawer
        title={`Order #${selectedOrder?.id || ""} Details`}
        placement="right"
        width={600}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        extra={
          <Button
            type="primary"
            onClick={() => {
              setDrawerVisible(false);
              showEditModal(selectedOrder);
            }}
          >
            Update Status
          </Button>
        }
      >
        {selectedOrder && (
          <>
            <Descriptions title="Order Information" bordered column={1}>
              <Descriptions.Item label="Order ID">
                {selectedOrder.id}
              </Descriptions.Item>
              <Descriptions.Item label="Date">
                {new Date(selectedOrder.created_at).toLocaleString("en-IN")}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                {getStatusTag(selectedOrder.status)}
              </Descriptions.Item>
              <Descriptions.Item label="Total Amount">
                ₫{parseFloat(selectedOrder.total_amount).toFixed(2)}
              </Descriptions.Item>
              <Descriptions.Item label="Payment Status">
                {selectedOrder.payment_status ? "Paid" : "Pending"}
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            <Title level={5}>
              <UserOutlined /> Customer Information
            </Title>
            {selectedOrder.user ? (
              <Descriptions bordered column={1}>
                <Descriptions.Item label="Username">
                  <Text strong>@{selectedOrder.user.username}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Name">
                  {`${selectedOrder.user.first_name || ""} ${
                    selectedOrder.user.last_name || ""
                  }`.trim() || "No Name Provided"}
                </Descriptions.Item>
                <Descriptions.Item label="Email">
                  {selectedOrder.user.email}
                </Descriptions.Item>
              </Descriptions>
            ) : selectedOrder.user_id ? (
              <Descriptions bordered column={1}>
                <Descriptions.Item label="User ID">
                  <Text strong>{selectedOrder.user_id}</Text>
                </Descriptions.Item>
              </Descriptions>
            ) : (
              <Text>Guest Order</Text>
            )}

            <Divider />

            <Title level={5}>
              <HomeOutlined /> Shipping Address
            </Title>
            {selectedOrder.shipping_address ? (
              <Descriptions bordered column={1}>
                <Descriptions.Item label="Name">
                  {`${selectedOrder.shipping_address.first_name} ${selectedOrder.shipping_address.last_name}`}
                </Descriptions.Item>
                <Descriptions.Item label="Address">
                  {`${selectedOrder.shipping_address.street_address}${
                    selectedOrder.shipping_address.apartment_address
                      ? ", " + selectedOrder.shipping_address.apartment_address
                      : ""
                  },
                  ${selectedOrder.shipping_address.city}, ${
                    selectedOrder.shipping_address.state
                  }, ${selectedOrder.shipping_address.zip_code}`}
                </Descriptions.Item>
                <Descriptions.Item label="Phone">
                  {selectedOrder.shipping_address.phone}
                </Descriptions.Item>
                <Descriptions.Item label="Email">
                  {selectedOrder.shipping_address.email}
                </Descriptions.Item>
              </Descriptions>
            ) : (
              <Text>No shipping address provided</Text>
            )}

            <Divider />

            <Title level={5}>
              <ShoppingOutlined /> Order Items
            </Title>
            <List
              itemLayout="horizontal"
              dataSource={selectedOrder.items || []}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Avatar
                        shape="square"
                        size={64}
                        src={getValidImageUrl(
                          item.product?.primary_image,
                          item.product?.name,
                          64,
                          64
                        )}
                      />
                    }
                    title={item.product?.name || "Product"}
                    description={
                      <Space direction="vertical">
                        <Text>Quantity: {item.quantity}</Text>
                        <Text>Price: ₫{parseFloat(item.price).toFixed(2)}</Text>
                        <Text strong>
                          Subtotal: ₫
                          {(parseFloat(item.price) * item.quantity).toFixed(2)}
                        </Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </>
        )}
      </Drawer>
    </div>
  );
};

export default AdminOrders;
