import React, { useState, useEffect } from "react";
import {
  Table,
  Button,
  Space,
  Typography,
  Input,
  Modal,
  Form,
  Upload,
  message,
  Popconfirm,
  Select,
  Spin,
  Alert,
  Image,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { getValidImageUrl, handleImageError } from "../../utils/imageUtils";

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState("Add Category");
  const [editingCategory, setEditingCategory] = useState(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState("");
  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) {
          throw new Error("No authentication token found");
        }

        const response = await fetch("http://localhost:8000/api/categories/", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch categories");
        }

        const data = await response.json();
        setCategories(data.results);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching categories:", error);
        setError(error.message);
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // Handle add/edit category
  const showAddModal = () => {
    setModalTitle("Add Category");
    setEditingCategory(null);
    form.resetFields();
    setFileList([]);
    setModalVisible(true);
  };

  const showEditModal = (category) => {
    setModalTitle("Edit Category");
    setEditingCategory(category);

    // Set form values
    form.setFieldsValue({
      name: category.name,
      description: category.description,
      parent: category.parent ? category.parent.id : null,
    });

    // Set file list if there's an image
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

    setModalVisible(true);
  };

  const handleCancel = () => {
    setModalVisible(false);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setUploading(true);

      const token = localStorage.getItem("access_token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const formData = new FormData();
      formData.append("name", values.name);
      if (values.description) {
        formData.append("description", values.description);
      }
      if (values.parent) {
        formData.append("parent", values.parent);
      }

      // Add image if available
      if (fileList.length > 0 && fileList[0].originFileObj) {
        formData.append("image", fileList[0].originFileObj);
      }

      let url = "http://localhost:8000/api/categories/";
      let method = "POST";

      if (editingCategory) {
        url = `http://localhost:8000/api/categories/${editingCategory.id}/`;
        method = "PUT";
      }

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to save category");
      }

      message.success(
        `Category ${editingCategory ? "updated" : "added"} successfully`
      );
      setModalVisible(false);

      // Refresh category list
      const categoriesResponse = await fetch(
        "http://localhost:8000/api/categories/",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        setCategories(categoriesData.results);
      }
    } catch (error) {
      console.error("Error saving category:", error);
      message.error(error.message || "Failed to save category");
    } finally {
      setUploading(false);
    }
  };

  // Handle delete category
  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(
        `http://localhost:8000/api/categories/${id}/`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete category");
      }

      message.success("Category deleted successfully");

      // Remove category from state
      setCategories(categories.filter((category) => category.id !== id));
    } catch (error) {
      console.error("Error deleting category:", error);
      message.error(error.message || "Failed to delete category");
    }
  };

  // Handle file upload
  const handleFileChange = ({ fileList }) => {
    setFileList(fileList);
  };

  // Filter categories by search text
  const filteredCategories = categories.filter(
    (category) =>
      category.name.toLowerCase().includes(searchText.toLowerCase()) ||
      (category.description &&
        category.description.toLowerCase().includes(searchText.toLowerCase()))
  );

  // Table columns
  const columns = [
    {
      title: "Image",
      dataIndex: "image",
      key: "image",
      render: (image, record) => (
        <Image
          src={getValidImageUrl(record.image_url || image, record.name, 50, 50)}
          alt={record.name}
          width={50}
          height={50}
          style={{ objectFit: "cover" }}
          onError={(e) => handleImageError(e, record.name, 50, 50)}
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
      title: "Parent Category",
      dataIndex: ["parent", "name"],
      key: "parent",
      render: (text) => text || "None",
      filters: [
        { text: "None", value: "none" },
        ...categories.map((category) => ({
          text: category.name,
          value: category.id,
        })),
      ],
      onFilter: (value, record) => {
        if (value === "none") return !record.parent;
        return record.parent && record.parent.id === value;
      },
    },
    {
      title: "Products",
      dataIndex: "product_count",
      key: "product_count",
      render: (_, record) => (record.products ? record.products.length : 0),
      sorter: (a, b) =>
        (a.products ? a.products.length : 0) -
        (b.products ? b.products.length : 0),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            icon={<EditOutlined />}
            size="small"
            onClick={() => showEditModal(record)}
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
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Spin size="large" />
        <p>Loading categories...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error"
        description={`Failed to load categories: ${error}`}
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
        <Title level={2}>Categories</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={showAddModal}>
          Add Category
        </Button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Input
          placeholder="Search categories"
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 300 }}
        />
      </div>

      <Table
        columns={columns}
        dataSource={filteredCategories.map((category) => ({
          ...category,
          key: category.id,
        }))}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={modalTitle}
        open={modalVisible}
        onCancel={handleCancel}
        footer={[
          <Button key="cancel" onClick={handleCancel}>
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={uploading}
            onClick={handleSubmit}
          >
            Save
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Category Name"
            rules={[{ required: true, message: "Please enter category name" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <TextArea rows={4} />
          </Form.Item>

          <Form.Item name="parent" label="Parent Category">
            <Select allowClear placeholder="Select parent category">
              {categories.map((category) => (
                <Option
                  key={category.id}
                  value={category.id}
                  disabled={
                    editingCategory && editingCategory.id === category.id
                  }
                >
                  {category.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="Category Image">
            <Upload
              listType="picture"
              fileList={fileList}
              onChange={handleFileChange}
              beforeUpload={() => false}
              maxCount={1}
            >
              <Button icon={<UploadOutlined />}>Select Image</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminCategories;
