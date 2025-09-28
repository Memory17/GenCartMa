import React, { useState, useEffect } from "react";
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Upload,
  message,
  Typography,
  Spin,
  Popconfirm,
  Switch,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { getValidImageUrl } from "../../utils/imageUtils";

const { Title, Text } = Typography;
const { TextArea } = Input;

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState("Add Category");
  const [form] = Form.useForm();
  const [editingCategory, setEditingCategory] = useState(null);
  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("access_token");
        const response = await fetch("http://localhost:8000/api/categories/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Failed to fetch categories");
        const data = await response.json();
        setCategories(data.results || data || []);
      } catch (error) {
        console.error("Error fetching categories:", error);
        message.error("Failed to load categories");
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  // Show add/edit modal
  const showModal = (category = null) => {
    setEditingCategory(category);
    setModalTitle(category ? "Edit Category" : "Add Category");

    if (category) {
      form.setFieldsValue({
        name: category.name,
        description: category.description,
        is_active: category.is_active,
      });

      if (category.image) {
        setFileList([
          {
            uid: "-1",
            name: "image.png",
            status: "done",
            url: category.image,
          },
        ]);
      } else {
        setFileList([]);
      }
    } else {
      form.resetFields();
      setFileList([]);
    }

    setModalVisible(true);
  };

  // Handle form submission
  const handleSubmit = async (values) => {
    try {
      setUploading(true);
      const token = localStorage.getItem("access_token");
      const formData = new FormData();
      formData.append("name", values.name);
      formData.append("description", values.description || "");
      formData.append("is_active", values.is_active);
      if (fileList.length > 0 && fileList[0].originFileObj)
        formData.append("image", fileList[0].originFileObj);

      let url = "http://localhost:8000/api/categories/";
      let method = "POST";
      if (editingCategory) {
        url = `http://localhost:8000/api/categories/${editingCategory.id}/`;
        method = "PATCH";
      }

      const response = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to save category");

      message.success(
        `Category ${editingCategory ? "updated" : "added"} successfully`
      );
      setModalVisible(false);

      // Refresh category list
      const categoriesResponse = await fetch(
        "http://localhost:8000/api/categories/",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        setCategories(categoriesData.results || categoriesData || []);
      }
    } catch (error) {
      console.error("Error saving category:", error);
      message.error("Failed to save category");
    } finally {
      setUploading(false);
    }
  };

  // Handle delete category
  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(
        `http://localhost:8000/api/categories/${id}/`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error("Failed to delete category");
      message.success("Category deleted successfully");
      setCategories(categories.filter((c) => c.id !== id));
    } catch (error) {
      console.error("Error deleting category:", error);
      message.error("Failed to delete category");
    }
  };

  // Upload props
  const uploadProps = {
    onRemove: () => {
      setFileList([]);
    },
    beforeUpload: (file) => {
      setFileList([file]);
      return false;
    },
    fileList,
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
      title: "Image",
      dataIndex: "image",
      key: "image",
      render: (text, record) => (
        <img
          src={getValidImageUrl(text, record.name, 50, 50)}
          alt={record.name}
          style={{ width: 50, height: 50, objectFit: "cover" }}
        />
      ),
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
    },
    {
      title: "Products",
      dataIndex: "product_count",
      key: "product_count",
      sorter: (a, b) => a.product_count - b.product_count,
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
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => showModal(record)}
            size="small"
          />
          <Popconfirm
            title="Are you sure you want to delete this category?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="primary"
              danger
              icon={<DeleteOutlined />}
              size="small"
              disabled={record.product_count > 0} // Prevent deleting categories with products
            />
          </Popconfirm>
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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <Title level={2}>Categories</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => showModal()}
        >
          Add Category
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={categories}
        rowKey="id"
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={modalTitle}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ is_active: true }}
        >
          <Form.Item
            name="name"
            label="Category Name"
            rules={[{ required: true, message: "Please enter category name" }]}
          >
            <Input placeholder="Enter category name" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <TextArea rows={4} placeholder="Enter category description" />
          </Form.Item>

          <Form.Item name="is_active" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item label="Category Image">
            <Upload {...uploadProps} listType="picture">
              <Button icon={<UploadOutlined />}>Select Image</Button>
            </Upload>
          </Form.Item>

          <Form.Item>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button
                style={{ marginRight: 8 }}
                onClick={() => setModalVisible(false)}
              >
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={uploading}>
                {editingCategory ? "Update" : "Add"} Category
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminCategories;
