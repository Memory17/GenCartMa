import React, { useState, useEffect } from "react";
import {
  Table,
  Button,
  Space,
  Typography,
  Input,
  Modal,
  Form,
  Select,
  message,
  Tag,
  Spin,
  Alert,
  Drawer,
  Descriptions,
  List,
  Avatar,
  Divider,
  Badge,
} from "antd";
import {
  SearchOutlined,
  EyeOutlined,
  EditOutlined,
  ShoppingOutlined,
} from "@ant-design/icons";
import { getValidImageUrl } from "../../utils/imageUtils";

const { Title, Text } = Typography;
const { Option } = Select;

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [form] = Form.useForm();

  // Fetch orders
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) {
          throw new Error("No authentication token found");
        }

        const response = await fetch("http://localhost:8000/api/orders/", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch orders");
        }

        const data = await response.json();
        console.log("Orders data in AdminOrders:", data);

        // Fetch user details for each order if not already included
        const ordersWithUserDetails = await Promise.all(
          data.results.map(async (order) => {
            if (!order.user && order.user_id) {
              try {
                const userResponse = await fetch(
                  `http://localhost:8000/api/users/${order.user_id}/`,
                  {
                    headers: {
                      Authorization: `Bearer ${token}`,
                    },
                  }
                );
                if (userResponse.ok) {
                  const userData = await userResponse.json();
                  return { ...order, user: userData };
                }
              } catch (error) {
                console.error(
                  `Error fetching user for order ${order.id}:`,
                  error
                );
              }
            }
            return order;
          })
        );

        setOrders(ordersWithUserDetails);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching orders:", error);
        setError(error.message);
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

  // Show edit order modal
  const showEditModal = (order) => {
    setEditingOrder(order);
    form.setFieldsValue({
      status: order.status,
      payment_status: order.payment_status,
      tracking_number: order.tracking_number || "",
    });
    setModalVisible(true);
  };

  // Handle update order
  const handleUpdateOrder = async () => {
    try {
      const values = await form.validateFields();

      const token = localStorage.getItem("access_token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(
        `http://localhost:8000/api/orders/${editingOrder.id}/`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update order");
      }

      message.success("Order updated successfully");
      setModalVisible(false);

      // Update order in state
      const updatedOrder = await response.json();
      setOrders(
        orders.map((order) =>
          order.id === updatedOrder.id ? updatedOrder : order
        )
      );

      // If the drawer is open and showing this order, update it there too
      if (selectedOrder && selectedOrder.id === updatedOrder.id) {
        setSelectedOrder(updatedOrder);
      }
    } catch (error) {
      console.error("Error updating order:", error);
      message.error(error.message || "Failed to update order");
    }
  };

  // Filter orders by search text
  const filteredOrders = orders.filter((order) => {
    const searchLower = searchText.toLowerCase();
    return (
      order.id.toString().includes(searchLower) ||
      (order.user &&
        order.user.username &&
        order.user.username.toLowerCase().includes(searchLower)) ||
      (order.user_id && order.user_id.toString().includes(searchLower)) ||
      (order.tracking_number &&
        order.tracking_number.toLowerCase().includes(searchLower))
    );
  });

  // Get status tag color
  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "blue";
      case "processing":
        return "orange";
      case "shipped":
        return "cyan";
      case "delivered":
        return "green";
      case "cancelled":
        return "red";
      default:
        return "default";
    }
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
      key: "customer",
      render: (_, record) => {
        console.log("Order record in AdminOrders:", record); // Debug log
        if (record.user && record.user.username) {
          return `@${record.user.username}`;
        } else if (record.user_id) {
          return `User ${record.user_id}`;
        } else {
          return "Guest";
        }
      },
      sorter: (a, b) => {
        const aName = a.user
          ? `@${a.user.username}`
          : a.user_id
          ? `User ${a.user_id}`
          : "Guest";
        const bName = b.user
          ? `@${b.user.username}`
          : b.user_id
          ? `User ${b.user_id}`
          : "Guest";
        return aName.localeCompare(bName);
      },
    },
    {
      title: "Date",
      dataIndex: "created_at",
      key: "date",
      render: (date) => new Date(date).toLocaleDateString(),
      sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag color={getStatusColor(status)}>{status.toUpperCase()}</Tag>
      ),
      filters: [
        { text: "Pending", value: "pending" },
        { text: "Processing", value: "processing" },
        { text: "Shipped", value: "shipped" },
        { text: "Delivered", value: "delivered" },
        { text: "Cancelled", value: "cancelled" },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: "Payment",
      dataIndex: "payment_status",
      key: "payment",
      render: (paid) => (
        <Tag color={paid ? "green" : "red"}>{paid ? "PAID" : "UNPAID"}</Tag>
      ),
      filters: [
        { text: "Paid", value: true },
        { text: "Unpaid", value: false },
      ],
      onFilter: (value, record) => record.payment_status === value,
    },
    {
      title: "Total (VND)",
      dataIndex: "total_amount",
      key: "total",
      render: (amount) => `₫${parseFloat(amount).toFixed(2)}`,
      sorter: (a, b) => parseFloat(a.total_amount) - parseFloat(b.total_amount),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => showOrderDetails(record)}
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
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Spin size="large" />
        <p>Loading orders...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error"
        description={`Failed to load orders: ${error}`}
        type="error"
        showIcon
      />
    );
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <Title level={2}>Orders</Title>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Input
          placeholder="Search orders by ID, customer, or tracking number"
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 400 }}
        />
      </div>

      <Table
        columns={columns}
        dataSource={filteredOrders.map((order) => ({
          ...order,
          key: order.id,
        }))}
        pagination={{ pageSize: 10 }}
      />

      {/* Order Details Drawer */}
      <Drawer
        title={
          selectedOrder ? `Order #${selectedOrder.id} Details` : "Order Details"
        }
        placement="right"
        width={600}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
      >
        {selectedOrder && (
          <>
            <Descriptions bordered column={1}>
              <Descriptions.Item label="Order ID">
                {selectedOrder.id}
              </Descriptions.Item>
              <Descriptions.Item label="Customer">
                {selectedOrder.user && selectedOrder.user.username
                  ? `@${selectedOrder.user.username}`
                  : selectedOrder.user_id
                  ? `User ${selectedOrder.user_id}`
                  : "Guest"}
              </Descriptions.Item>
              <Descriptions.Item label="Date">
                {new Date(selectedOrder.created_at).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={getStatusColor(selectedOrder.status)}>
                  {selectedOrder.status.toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Payment Status">
                <Tag color={selectedOrder.payment_status ? "green" : "red"}>
                  {selectedOrder.payment_status ? "PAID" : "UNPAID"}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Tracking Number">
                {selectedOrder.tracking_number || "Not assigned"}
              </Descriptions.Item>
              <Descriptions.Item label="Shipping Address">
                {selectedOrder.shipping_address ? (
                  <>
                    {selectedOrder.shipping_address.street_address}
                    {selectedOrder.shipping_address.apartment_address &&
                      `, ${selectedOrder.shipping_address.apartment_address}`}
                    <br />
                    {selectedOrder.shipping_address.city},{" "}
                    {selectedOrder.shipping_address.state}{" "}
                    {selectedOrder.shipping_address.zip_code}
                    <br />
                    {selectedOrder.shipping_address.country}
                  </>
                ) : (
                  "No shipping address provided"
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Total Amount (VND)">
                ₫{parseFloat(selectedOrder.total_amount).toFixed(2)}
              </Descriptions.Item>
            </Descriptions>

            <Divider orientation="left">Order Items</Divider>

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
                          item.product.image_url || item.product.primary_image,
                          item.product.name,
                          64,
                          64
                        )}
                        icon={<ShoppingOutlined />}
                      />
                    }
                    title={item.product.name}
                    description={
                      <>
                        <Text>Quantity: {item.quantity}</Text>
                        <br />
                        <Text>Price: ₫{parseFloat(item.price).toFixed(2)}</Text>
                        <br />
                        <Text strong>
                          Total: ₫
                          {(parseFloat(item.price) * item.quantity).toFixed(2)}
                        </Text>
                      </>
                    }
                  />
                </List.Item>
              )}
            />

            <div style={{ marginTop: 16, textAlign: "right" }}>
              <Button
                type="primary"
                onClick={() => showEditModal(selectedOrder)}
              >
                Update Order
              </Button>
            </div>
          </>
        )}
      </Drawer>

      {/* Edit Order Modal */}
      <Modal
        title="Update Order"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setModalVisible(false)}>
            Cancel
          </Button>,
          <Button key="submit" type="primary" onClick={handleUpdateOrder}>
            Update
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="status"
            label="Order Status"
            rules={[{ required: true, message: "Please select order status" }]}
          >
            <Select>
              <Option value="pending">Pending</Option>
              <Option value="processing">Processing</Option>
              <Option value="shipped">Shipped</Option>
              <Option value="delivered">Delivered</Option>
              <Option value="cancelled">Cancelled</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="payment_status"
            label="Payment Status"
            valuePropName="checked"
          >
            <Select>
              <Option value={true}>Paid</Option>
              <Option value={false}>Unpaid</Option>
            </Select>
          </Form.Item>

          <Form.Item name="tracking_number" label="Tracking Number">
            <Input placeholder="Enter tracking number" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminOrders;
