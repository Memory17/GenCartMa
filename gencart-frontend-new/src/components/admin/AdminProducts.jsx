import React, { useState, useEffect } from "react";
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Upload,
  message,
  Popconfirm,
  Typography,
  Switch,
  Spin,
  Tag,
  Tooltip,
  Card,
  Row,
  Col,
  Segmented,
  Skeleton,
  Badge,
  Empty,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  SearchOutlined,
  ReloadOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  FireOutlined,
  TagOutlined,
} from "@ant-design/icons";
// Cloudinary config moved to backend

// Cloudinary config moved to utils/cloudinaryConfig

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// Debounce helper
const useDebounce = (value, delay = 500) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

const currencyFormat = (v) =>
  `₫${parseFloat(v).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState("Add Product");
  const [form] = Form.useForm();
  const [editingProduct, setEditingProduct] = useState(null);
  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState(false);

  // UX/Filter state
  const [viewMode, setViewMode] = useState("Table"); // 'Table' | 'Grid'
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [onlyActive, setOnlyActive] = useState(false);
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Pagination state
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    showSizeChanger: true,
    pageSizeOptions: ["10", "20", "50", "100"],
  });

  // Function to fetch products
  const fetchProducts = async (page = 1, pageSize = 10) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("access_token");
      const url = new URL("http://localhost:8000/api/products/");
      url.searchParams.append("page", page);
      url.searchParams.append("page_size", pageSize);
      if (debouncedSearch) url.searchParams.append("search", debouncedSearch);
      // We will filter client-side for category selections (backend may not support multi-category filter yet)
      const productsResponse = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      if (!productsResponse.ok)
        throw new Error(`Failed products ${productsResponse.status}`);
      const data = await productsResponse.json();
      const list = data.results || data || [];
      let processed = [...list];
      if (onlyActive) processed = processed.filter((p) => p.is_active);
      if (lowStockOnly)
        processed = processed.filter(
          (p) => p.inventory !== undefined && p.inventory < 10
        );
      if (selectedCategories.length) {
        processed = processed.filter(
          (p) => p.category && selectedCategories.includes(p.category.name)
        );
      }
      setProducts(processed);
      setPagination((prev) => ({
        ...prev,
        current: page,
        pageSize,
        total: data.count || list.length,
      }));
      return true;
    } catch (e) {
      console.error(e);
      message.error("Failed to load products");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Function to manually refresh products
  const handleRefresh = async () => {
    message.loading("Refreshing products...", 1);
    try {
      const success = await fetchProducts(
        pagination.current,
        pagination.pageSize
      );
      if (success) {
        message.success(`Refreshed ${products.length} products`);
      } else {
        message.error("Failed to refresh products");
      }
    } catch (error) {
      console.error("Error refreshing products:", error);
      message.error(`Failed to refresh product list: ${error.message}`);
    }
  };

  // Fetch products and categories
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("access_token");
        if (!token) {
          message.error("Auth error");
          setLoading(false);
          return;
        }
        const categoriesResponse = await fetch(
          "http://localhost:8000/api/categories/",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (categoriesResponse.ok) {
          const catData = await categoriesResponse.json();
          setCategories(catData.results || catData || []);
        }
        await fetchProducts(1, pagination.pageSize);
      } catch (e) {
        console.error(e);
        message.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch when search / filters change (client side modifications re-applied after fetch)
  useEffect(() => {
    fetchProducts(pagination.current, pagination.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, selectedCategories, onlyActive, lowStockOnly]);

  // Handle add/edit product
  const showModal = (product = null) => {
    setEditingProduct(product);
    setModalTitle(product ? "Edit Product" : "Add Product");

    if (product) {
      form.setFieldsValue({
        name: product.name,
        description: product.description,
        price: parseFloat(product.price),
        discount_price: product.discount_price
          ? parseFloat(product.discount_price)
          : null,
        category_id: product.category ? product.category.id : null,
        inventory: product.inventory,
        is_active: product.is_active,
      });

      // Determine the image URL to display
      let imageUrl = null;

      // Try different image sources in order of preference
      if (product.image_url) {
        imageUrl = product.image_url;
      } else if (product.primary_image) {
        imageUrl = product.primary_image;
      } else if (product.image && typeof product.image === "string") {
        imageUrl = product.image.startsWith("http")
          ? product.image
          : `http://localhost:8000${product.image}`;
      }

      console.log("Product image URL for edit:", imageUrl);

      if (imageUrl) {
        // Create a file list with the existing image
        setFileList([
          {
            uid: "-1",
            name: `product-${product.id}-image.jpg`,
            status: "done",
            url: imageUrl,
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
      if (!token) {
        throw new Error("No authentication token found");
      }

      // Prepare FormData for file upload to backend
      const formData = new FormData();
      formData.append("name", values.name);
      formData.append("description", values.description);
      formData.append("price", values.price);
      if (values.discount_price) {
        formData.append("discount_price", values.discount_price);
      }
      formData.append("category_id", values.category_id);
      formData.append("inventory", values.inventory);
      formData.append("is_active", values.is_active);

      // Add image file if selected
      console.log("FileList:", fileList);
      console.log("FileList length:", fileList.length);
      if (fileList.length > 0) {
        console.log("First file:", fileList[0]);
        console.log("OriginFileObj:", fileList[0].originFileObj);
        console.log("File itself:", fileList[0]);

        // Try different ways to get the file
        const file = fileList[0].originFileObj || fileList[0];
        if (file && file instanceof File) {
          console.log("Adding file to FormData:", file);
          formData.append("primary_image", file);
        } else {
          console.log("No valid file found in fileList");
        }
      } else {
        console.log("No file to add to FormData");
      }

      let url = "http://localhost:8000/api/products/";
      let method = "POST";
      if (editingProduct) {
        url = `http://localhost:8000/api/products/${editingProduct.id}/`;
        method = "PATCH";
      }

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          // Don't set Content-Type for FormData - browser will set it with boundary
        },
        body: formData,
      });

      if (!response.ok) {
        let detail = "";
        try {
          const errJson = await response.json();
          detail =
            typeof errJson === "string" ? errJson : JSON.stringify(errJson);
        } catch {
          // ignore JSON parse error
        }
        throw new Error(`Failed to save product${detail ? `: ${detail}` : ""}`);
      }

      const productResponse = await response.json();
      if (!editingProduct) setProducts((p) => [...p, productResponse]);
      else
        setProducts((p) =>
          p.map((pr) => (pr.id === productResponse.id ? productResponse : pr))
        );

      message.success(
        `Product ${editingProduct ? "updated" : "added"} successfully`
      );
      setModalVisible(false);
      form.resetFields();
      setFileList([]);

      // Refresh product list
      await fetchProducts(pagination.current, pagination.pageSize);
    } catch (error) {
      console.error("Error saving product:", error);
      message.error(error.message || "Failed to save product");
    } finally {
      setUploading(false);
    }
  };

  // Handle table changes (pagination, sorting, filtering)
  const handleTableChange = (pag) => {
    setPagination((prev) => ({
      ...prev,
      current: pag.current,
      pageSize: pag.pageSize,
    }));
    fetchProducts(pag.current, pag.pageSize);
  };

  // Handle delete product
  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(
        `http://localhost:8000/api/products/${id}/`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error("Failed");
      message.success("Product deleted");
      setProducts(products.filter((p) => p.id !== id));
    } catch (e) {
      console.error(e);
      message.error("Failed to delete product");
    }
  };

  // Inline active toggle
  const toggleActive = async (record) => {
    try {
      const token = localStorage.getItem("access_token");
      const updated = { is_active: !record.is_active };
      const res = await fetch(
        `http://localhost:8000/api/products/${record.id}/`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updated),
        }
      );
      if (!res.ok) throw new Error("Failed to update status");
      setProducts((prev) =>
        prev.map((p) => (p.id === record.id ? { ...p, ...updated } : p))
      );
    } catch {
      message.error("Toggle failed");
    }
  };

  const renderInventoryTag = (inv) => {
    if (inv === 0) return <Tag color="red">Out of stock</Tag>;
    if (inv < 5) return <Tag color="volcano">Low ({inv})</Tag>;
    if (inv < 15) return <Tag color="gold">{inv}</Tag>;
    return <Tag color="green">{inv}</Tag>;
  };

  const renderPrice = (price, discount) => {
    if (discount && parseFloat(discount) < parseFloat(price)) {
      return (
        <span>
          <span
            style={{
              textDecoration: "line-through",
              color: "#999",
              marginRight: 4,
            }}
          >
            {currencyFormat(price)}
          </span>
          <Tag color="magenta" icon={<FireOutlined />}>
            {currencyFormat(discount)}
          </Tag>
        </span>
      );
    }
    return <span>{currencyFormat(price)}</span>;
  };

  const buildImageUrl = (record) => {
    return (
      record.image_url ||
      `https://placehold.co/300x400?text=${encodeURIComponent(
        record.category?.name?.split(" ")[0] || record.name.charAt(0)
      )}`
    );
  };

  const ProductCard = ({ item }) => {
    const img = buildImageUrl(item);
    return (
      <Card
        hoverable
        cover={
          <Badge.Ribbon
            text={item.is_active ? "Active" : "Hidden"}
            color={item.is_active ? "green" : "gray"}
          >
            <div
              style={{
                height: 260,
                overflow: "hidden",
                background: "#f5f5f5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img
                src={img}
                alt={item.name}
                style={{ width: "100%", objectFit: "cover" }}
                loading="lazy"
              />
            </div>
          </Badge.Ribbon>
        }
        actions={[
          <Tooltip title="Edit" key="edit">
            <EditOutlined onClick={() => showModal(item)} />
          </Tooltip>,
          <Tooltip title="Delete" key="delete">
            <Popconfirm
              title="Delete product?"
              onConfirm={() => handleDelete(item.id)}
            >
              <DeleteOutlined style={{ color: "#ff4d4f" }} />
            </Popconfirm>
          </Tooltip>,
          <Tooltip title="Toggle active" key="active">
            <Switch
              size="small"
              checked={item.is_active}
              onChange={() => toggleActive(item)}
            />
          </Tooltip>,
        ]}
        style={{ borderRadius: 12 }}
      >
        <Tag icon={<TagOutlined />} style={{ marginBottom: 8 }}>
          {item.category?.name || "Uncategorized"}
        </Tag>
        <Title level={5} style={{ marginBottom: 4 }}>
          {item.name}
        </Title>
        <div style={{ marginBottom: 6 }}>
          {renderPrice(item.price, item.discount_price)}
        </div>
        <div style={{ marginBottom: 6 }}>
          {renderInventoryTag(item.inventory)}
        </div>
        {item.discount_price && (
          <Tag color="red" style={{ marginBottom: 4 }}>
            {(
              (1 - parseFloat(item.discount_price) / parseFloat(item.price)) *
              100
            ).toFixed(0)}
            % OFF
          </Tag>
        )}
        <Text type="secondary" style={{ fontSize: 12 }}>
          ID: {item.id}
        </Text>
      </Card>
    );
  };

  // Handle file upload change
  const handleFileChange = ({ fileList: newFileList }) => {
    setFileList(newFileList);
  };

  // Upload props
  const uploadProps = {
    onRemove: () => setFileList([]),
    beforeUpload: (file) => {
      setFileList([file]);
      return false;
    },
    fileList,
    onChange: handleFileChange,
  };

  // Table columns (rebuilt cleanly after UX refactor)
  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 70,
      sorter: (a, b) => a.id - b.id,
    },
    {
      title: "Image",
      dataIndex: "image_url",
      key: "image_url",
      width: 80,
      render: (_, record) => {
        const imageUrl = buildImageUrl(record);
        return (
          <img
            src={imageUrl}
            alt={record.name}
            style={{
              width: 50,
              height: 50,
              objectFit: "cover",
              borderRadius: 4,
            }}
          />
        );
      },
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text, record) => (
        <Tooltip title={record.description}>
          <span style={{ fontWeight: 500 }}>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: "Category",
      dataIndex: ["category", "name"],
      key: "category",
      filters: categories.map((c) => ({ text: c.name, value: c.name })),
      onFilter: (value, record) => record.category?.name === value,
      render: (value) => <Tag>{value || "—"}</Tag>,
    },
    {
      title: "Price",
      dataIndex: "price",
      key: "price",
      sorter: (a, b) => parseFloat(a.price) - parseFloat(b.price),
      render: (text, record) => renderPrice(text, record.discount_price),
    },
    {
      title: "Discount",
      dataIndex: "discount_price",
      key: "discount_price",
      render: (text) =>
        text ? (
          <Tag color="magenta">{currencyFormat(text)}</Tag>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "Inventory",
      dataIndex: "inventory",
      key: "inventory",
      sorter: (a, b) => a.inventory - b.inventory,
      render: (inv) => renderInventoryTag(inv),
    },
    {
      title: "Active",
      dataIndex: "is_active",
      key: "is_active",
      filters: [
        { text: "Active", value: true },
        { text: "Inactive", value: false },
      ],
      onFilter: (value, record) => record.is_active === value,
      render: (active, record) => (
        <Switch
          checked={active}
          size="small"
          onChange={() => toggleActive(record)}
        />
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Edit">
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => showModal(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Popconfirm
              title="Are you sure you want to delete this product?"
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
          </Tooltip>
        </Space>
      ),
    },
  ];

  const FiltersBar = (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
        marginBottom: 16,
      }}
    >
      <Input
        allowClear
        prefix={<SearchOutlined style={{ color: "#999" }} />}
        placeholder="Search products / descriptions"
        style={{ width: 260 }}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <Select
        mode="multiple"
        maxTagCount={2}
        placeholder="Filter categories"
        style={{ minWidth: 220 }}
        value={selectedCategories}
        onChange={setSelectedCategories}
        allowClear
      >
        {categories.map((c) => (
          <Select.Option key={c.id} value={c.name}>
            {c.name}
          </Select.Option>
        ))}
      </Select>
      <Switch
        checked={onlyActive}
        onChange={setOnlyActive}
        size="small"
        style={{ marginTop: 4 }}
      />
      <Text style={{ marginRight: 8 }}>Only Active</Text>
      <Switch
        checked={lowStockOnly}
        onChange={setLowStockOnly}
        size="small"
        style={{ marginTop: 4 }}
      />
      <Text>Low Stock (&lt;10)</Text>
    </div>
  );

  const ProductGrid = (
    <div style={{ minHeight: 200 }}>
      {loading ? (
        <Row gutter={[16, 16]}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Col xs={12} sm={8} md={6} lg={6} key={i}>
              <Card style={{ borderRadius: 12 }}>
                <Skeleton.Image style={{ width: "100%", height: 180 }} />
                <Skeleton active title={false} paragraph={{ rows: 3 }} />
              </Card>
            </Col>
          ))}
        </Row>
      ) : products.length ? (
        <Row gutter={[16, 16]}>
          {products.map((p) => (
            <Col xs={12} sm={12} md={8} lg={6} key={p.id}>
              <ProductCard item={p} />
            </Col>
          ))}
        </Row>
      ) : (
        <Empty description="No products found" />
      )}
    </div>
  );

  const ProductTable = (
    <Table
      columns={columns}
      dataSource={products}
      rowKey="id"
      pagination={pagination}
      onChange={handleTableChange}
      loading={loading}
      size="middle"
      scroll={{ x: 900 }}
      locale={{
        emptyText: (
          <div style={{ padding: "20px 0" }}>
            <p>No products found</p>
            <Button
              type="primary"
              onClick={handleRefresh}
              icon={<ReloadOutlined />}
            >
              Refresh Products
            </Button>
          </div>
        ),
      }}
    />
  );

  return (
    <div style={{ padding: 4 }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          justifyContent: "space-between",
          marginBottom: 12,
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Title level={2} style={{ margin: 0 }}>
            Products
          </Title>
          <Tag color="geekblue" style={{ fontSize: 12 }}>
            {products.length} visible
          </Tag>
        </div>
        <Space wrap>
          <Segmented
            size="middle"
            options={[
              {
                label: "Table",
                value: "Table",
                icon: <UnorderedListOutlined />,
              },
              { label: "Grid", value: "Grid", icon: <AppstoreOutlined /> },
            ]}
            value={viewMode}
            onChange={setViewMode}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={loading}
          >
            Refresh
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => showModal()}
          >
            Add Product
          </Button>
        </Space>
      </div>

      {FiltersBar}

      {viewMode === "Table" ? ProductTable : ProductGrid}

      <Modal
        title={modalTitle}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label="Product Name"
            rules={[{ required: true, message: "Please enter product name" }]}
          >
            <Input placeholder="Enter product name" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[
              { required: true, message: "Please enter product description" },
            ]}
          >
            <TextArea rows={4} placeholder="Enter product description" />
          </Form.Item>

          <Form.Item
            name="category_id"
            label="Category"
            rules={[{ required: true, message: "Please select a category" }]}
          >
            <Select placeholder="Select a category">
              {categories.map((category) => (
                <Option key={category.id} value={category.id}>
                  {category.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="price"
            label="Price"
            rules={[{ required: true, message: "Please enter product price" }]}
          >
            <InputNumber
              min={0}
              step={0.01}
              style={{ width: "100%" }}
              formatter={(value) =>
                `₫ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
              }
              parser={(value) => value.replace(/₫\s?|(,*)/g, "")}
              placeholder="Enter price"
            />
          </Form.Item>

          <Form.Item name="discount_price" label="Discount Price (Optional)">
            <InputNumber
              min={0}
              step={0.01}
              style={{ width: "100%" }}
              formatter={(value) =>
                value ? `₫ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : ""
              }
              parser={(value) => value.replace(/₫\s?|(,*)/g, "")}
              placeholder="Enter discount price"
            />
          </Form.Item>

          <Form.Item
            name="inventory"
            label="Inventory"
            rules={[
              { required: true, message: "Please enter inventory count" },
            ]}
          >
            <InputNumber
              min={0}
              style={{ width: "100%" }}
              placeholder="Enter inventory count"
            />
          </Form.Item>

          <Form.Item
            name="is_active"
            label="Active"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch />
          </Form.Item>

          <Form.Item
            label="Product Image"
            tooltip="Upload images to Cloudinary via backend"
          >
            <Upload
              {...uploadProps}
              listType="picture"
              maxCount={1}
              accept="image/*"
            >
              <Button icon={<UploadOutlined />}>Select Image</Button>
            </Upload>
            <div style={{ marginTop: 6 }}>
              <Text type="secondary">
                Image will be uploaded to Cloudinary when you save the product.
              </Text>
            </div>
          </Form.Item>

          <Form.Item>
            <div
              style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}
            >
              <Button onClick={() => setModalVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={uploading}>
                {editingProduct ? "Update" : "Add"} Product
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminProducts;
