import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import {
  Typography,
  Row,
  Col,
  Card,
  Button,
  Input,
  Select,
  Spin,
  Empty,
  message,
  Space,
  Tag,
  Tooltip,
  Slider,
  Rate,
  Checkbox,
} from "antd";
import {
  ShoppingCartOutlined,
  SearchOutlined,
  ReloadOutlined,
  StarFilled,
  HeartOutlined,
  HeartFilled,
  EyeOutlined,
  FilterOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { inventoryEvents } from "../utils/inventoryEvents";
import useDebounce from "../hooks/useDebounce";
import GridProductCard from "../components/products/GridProductCard";
import ListProductCard from "../components/products/ListProductCard";
import { formatCurrency, discountPercent } from "../utils/format";
import "./ProductListPage.css";

const { Title, Text, Paragraph } = Typography;
// const { Meta } = Card; // Meta unused, keep commented
const { Option } = Select;
const { Search } = Input;

// Category color mapping
const CATEGORY_COLORS = Object.freeze({
  Electronics: "2196F3",
  Clothing: "4CAF50",
  "Home & Kitchen": "FF9800",
  Books: "9C27B0",
  "Sports & Outdoors": "F44336",
  "Phone & Accessories": "009688",
});
const getCategoryColor = (name) => CATEGORY_COLORS[name] || "607D8B";

// Local storage helpers
const loadFromStorage = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback; // ignore parse errors
  }
};
const saveToStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
};

const ProductListPage = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(""); // raw user input
  const [selectedCategory, setSelectedCategory] = useState(null); // Now stores category name instead of ID
  const [sortBy, setSortBy] = useState("name");
  const [viewMode, setViewMode] = useState(() =>
    loadFromStorage("productViewMode", "grid")
  ); // persisted
  // Advanced filters
  const [priceRange, setPriceRange] = useState([0, 0]);
  const [selectedPriceRange, setSelectedPriceRange] = useState([0, 0]);
  const [minRating, setMinRating] = useState(0);
  const [onlyOnSale, setOnlyOnSale] = useState(false);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [initialFetched, setInitialFetched] = useState(false);
  const [wishlist, setWishlist] = useState(() =>
    loadFromStorage("wishlistProductIds", [])
  );
  const toggleWishlist = (id) => {
    setWishlist((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    );
  };

  // Reduce debounce to make typing feel more responsive
  const debouncedSearch = useDebounce(searchTerm, 250);
  // Keep a ref to abort in‑flight product fetches when a new search fires
  const activeFetchRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Persist view mode & wishlist
  useEffect(() => {
    saveToStorage("productViewMode", viewMode);
  }, [viewMode]);
  useEffect(() => {
    saveToStorage("wishlistProductIds", wishlist);
  }, [wishlist]);

  // Parse query parameters
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const search = queryParams.get("search");
    const categoryName = queryParams.get("category");
    const sort = queryParams.get("sort");

    if (search) setSearchTerm(search);
    if (categoryName) setSelectedCategory(categoryName); // Directly use category name
    if (sort) setSortBy(sort);
  }, [location.search]);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch("http://localhost:8000/api/categories/");
        if (!response.ok) {
          throw new Error("Failed to fetch categories");
        }
        const data = await response.json();
        console.log("Categories API response:", data);

        // Check if data is an array or has a results property
        if (Array.isArray(data)) {
          setCategories(data);
        } else if (data.results && Array.isArray(data.results)) {
          setCategories(data.results);
        } else {
          // If neither, set an empty array
          setCategories([]);
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
        message.error("Failed to load categories");
      }
    };

    fetchCategories();
  }, []);

  // Function to fetch all pages of products (supports abort)
  const fetchAllProducts = async (baseUrl, abortSignal) => {
    let allProducts = [];
    let nextPageUrl = baseUrl;
    let totalCount = 0;

    while (nextPageUrl) {
      const separator = nextPageUrl.includes("?") ? "&" : "?";
      const urlWithTimestamp = `${nextPageUrl}${separator}_bust=${Date.now()}&_random=${Math.random()}`;
      console.log("Fetching products from:", urlWithTimestamp);
      const response = await fetch(urlWithTimestamp, { signal: abortSignal });
      if (!response.ok) throw new Error("Failed to fetch products");
      const data = await response.json();
      if (Array.isArray(data)) {
        allProducts = data;
        totalCount = data.length;
        nextPageUrl = null;
      } else if (data.results && Array.isArray(data.results)) {
        allProducts = [...allProducts, ...data.results];
        totalCount = data.count || allProducts.length;
        nextPageUrl = data.next;
      } else {
        console.warn("Unexpected products response shape", data);
        nextPageUrl = null;
      }
    }
    return { products: allProducts, totalCount };
  };

  // Central fetch function (abortable + reusable)
  const fetchProducts = useCallback(
    async (overrideSearchTerm = null) => {
      console.log("ProductListPage: Starting fetchProducts...");
      if (activeFetchRef.current) {
        activeFetchRef.current.abort();
      }
      const controller = new AbortController();
      activeFetchRef.current = controller;
      setLoading(true);
      try {
        let baseUrl = "http://localhost:8000/api/products/?";
        baseUrl += `page_size=100&no_pagination=true&`;
        baseUrl += `_=${Date.now()}&`;
        const effectiveSearch =
          overrideSearchTerm !== null ? overrideSearchTerm : debouncedSearch;
        if (effectiveSearch)
          baseUrl += `search=${encodeURIComponent(effectiveSearch)}&`;
        if (selectedCategory) {
          const categoryObj = categories.find(
            (cat) =>
              cat.name === selectedCategory || cat.slug === selectedCategory
          );
          if (categoryObj)
            baseUrl += `category=${encodeURIComponent(categoryObj.id)}&`;
          else baseUrl += `category=${encodeURIComponent(selectedCategory)}&`;
        }
        if (sortBy) baseUrl += `ordering=${sortBy}`;
        console.log("ProductListPage: Fetching from URL:", baseUrl);
        const { products: allProducts } = await fetchAllProducts(
          baseUrl,
          controller.signal
        );
        setProducts(allProducts);
        if (!initialFetched) {
          const maxPrice = allProducts.reduce(
            (m, p) => Math.max(m, p.price || 0, p.discount_price || 0),
            0
          );
          setPriceRange([0, maxPrice]);
          setSelectedPriceRange([0, maxPrice]);
          setInitialFetched(true);
        }
        console.log(
          "ProductListPage: Products set in state, count:",
          allProducts.length
        );
      } catch (error) {
        if (error.name === "AbortError") {
          console.log("Fetch aborted (expected during rapid search updates)");
        } else {
          console.error("Error fetching products:", error);
          message.error("Failed to load products");
        }
      } finally {
        if (activeFetchRef.current === controller) {
          setLoading(false);
          activeFetchRef.current = null;
        }
        console.log("ProductListPage: fetchProducts completed");
      }
    },
    [debouncedSearch, selectedCategory, sortBy, categories, initialFetched]
  );

  // Fetch products when debounced term / filters change
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Inventory refresh subscription
  useEffect(() => {
    const unsubscribe = inventoryEvents.subscribe((event) => {
      if (event.type === "ALL_REFRESH" || event.type === "PRODUCT_REFRESH") {
        fetchProducts();
      }
    });
    return () => unsubscribe();
  }, [fetchProducts]);

  // Derived displayed products after client-side filters
  const displayedProducts = useMemo(() => {
    let list = products.slice();
    list = list.filter((p) => {
      const price = p.discount_price || p.price || 0;
      return price >= selectedPriceRange[0] && price <= selectedPriceRange[1];
    });
    if (minRating > 0)
      list = list.filter((p) => (p.average_rating || 0) >= minRating);
    if (onlyOnSale)
      list = list.filter((p) => p.discount_price && p.discount_price < p.price);
    if (onlyInStock) list = list.filter((p) => (p.inventory || 0) > 0);
    return list;
  }, [products, selectedPriceRange, minRating, onlyOnSale, onlyInStock]);

  // Handle search
  const handleSearch = (value) => {
    // Immediate fetch (skip debounce wait) for explicit search action
    setSearchTerm(value);
    updateQueryParams({ search: value });
    fetchProducts(value);
  };

  // Handle category change - now works with category names
  const handleCategoryChange = (value) => {
    setSelectedCategory(value); // Value is now category name
    updateQueryParams({ category: value }); // Directly use category name in URL
  };

  // Handle sort change
  const handleSortChange = (value) => {
    setSortBy(value);
    updateQueryParams({ sort: value });
  };

  // Update query parameters
  const updateQueryParams = (params) => {
    const queryParams = new URLSearchParams(location.search);

    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        queryParams.set(key, value);
      } else {
        queryParams.delete(key);
      }
    });

    navigate({
      pathname: location.pathname,
      search: queryParams.toString(),
    });
  };

  // Get cart functions from context
  const { addToCart: addToCartContext } = useCart();

  // Add to cart
  const addToCart = (product) => {
    addToCartContext(product);
    message.success(`${product.name} added to cart!`);
  };

  // Refresh products
  const handleRefresh = () => {
    message.loading("Refreshing products...", 1);
    // Re-run the effect by changing a dependency
    setSortBy((prev) => {
      // Toggle between name and -name to force a refresh
      return prev === "name" ? "-name" : "name";
    });
  };

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
        minHeight: "100vh",
      }}
    >
      {/* Modern Header Section */}
      <div
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          padding: "40px 24px 48px", // reduced vertical padding
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle background pattern */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* Page Title */}
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <Title
              level={1}
              style={{
                color: "white",
                marginBottom: "8px",
                fontSize: "clamp(2.1rem, 4.2vw, 3.05rem)", // slightly smaller
                fontWeight: "800",
                textShadow: "0 4px 20px rgba(0,0,0,0.3)",
                letterSpacing: "-0.02em",
              }}
            >
              Discover Amazing Products
            </Title>
            <Paragraph
              style={{
                color: "rgba(255,255,255,0.9)",
                fontSize: "clamp(1rem, 2vw, 1.2rem)",
                maxWidth: "600px",
                margin: "0 auto",
                lineHeight: "1.6",
              }}
            >
              Find exactly what you're looking for from our curated collection
              of premium products
            </Paragraph>
          </div>

          {/* Enhanced Search and Filter Bar */}
          <div
            style={{
              background: "rgba(255,255,255,0.12)",
              backdropFilter: "blur(18px)",
              borderRadius: "20px",
              padding: "20px 22px 18px", // tighter padding
              border: "1px solid rgba(255,255,255,0.18)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            }}
          >
            <Row gutter={[16, 16]} align="middle" className="filter-bar-row">
              {/* Search Bar */}
              <Col xs={24} md={12} lg={8}>
                <div className="filter-group">
                  <Text className="filter-label">
                    <SearchOutlined style={{ marginRight: 6 }} /> Search
                    Products
                  </Text>
                  <Search
                    placeholder="What are you looking for?"
                    value={searchTerm}
                    allowClear
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onSearch={handleSearch}
                    size="middle" // reduced control height
                    style={{ width: "100%" }}
                    className="modern-search"
                  />
                </div>
              </Col>

              {/* Category Filter */}
              <Col xs={24} md={6} lg={5}>
                <div className="filter-group">
                  <Text className="filter-label">
                    <FilterOutlined style={{ marginRight: 6 }} /> Category
                  </Text>
                  <Select
                    placeholder="All Categories"
                    style={{ width: "100%" }}
                    value={selectedCategory} // Now uses category name
                    onChange={handleCategoryChange}
                    allowClear
                    size="middle"
                    showSearch
                    className="modern-select"
                  >
                    {categories.map((category) => (
                      <Option key={category.id} value={category.name}>
                        {" "}
                        {/* Value is now category name */}
                        <Space>
                          <div
                            style={{
                              width: "10px",
                              height: "10px",
                              borderRadius: "50%",
                              background: `#${getCategoryColor(category.name)}`,
                            }}
                          />
                          {category.name}
                        </Space>
                      </Option>
                    ))}
                  </Select>
                </div>
              </Col>

              {/* Sort Options */}
              <Col xs={24} md={6} lg={5}>
                <div className="filter-group">
                  <Text className="filter-label">Sort By</Text>
                  <Select
                    value={sortBy}
                    onChange={handleSortChange}
                    size="middle"
                    style={{ width: "100%" }}
                    className="modern-select"
                  >
                    <Option value="name">Name (A-Z)</Option>
                    <Option value="-name">Name (Z-A)</Option>
                    <Option value="price">Price: Low to High</Option>
                    <Option value="-price">Price: High to Low</Option>
                    <Option value="-average_rating">Rating: High to Low</Option>
                    <Option value="average_rating">Rating: Low to High</Option>
                    <Option value="-created_at">Newest First</Option>
                    <Option value="created_at">Oldest First</Option>
                  </Select>
                </div>
              </Col>

              {/* View Mode Toggle */}
              <Col xs={12} md={3} lg={2}>
                <div className="filter-group">
                  <Text className="filter-label">View</Text>
                  <Button.Group size="middle">
                    <Button
                      type={viewMode === "grid" ? "primary" : "default"}
                      icon={<AppstoreOutlined />}
                      onClick={() => setViewMode("grid")}
                      style={{
                        background:
                          viewMode === "grid"
                            ? "rgba(255,255,255,0.2)"
                            : "transparent",
                        borderColor: "rgba(255,255,255,0.3)",
                        color: "white",
                      }}
                      loading={loading}
                    />
                    <Button
                      type={viewMode === "list" ? "primary" : "default"}
                      icon={<UnorderedListOutlined />}
                      onClick={() => setViewMode("list")}
                      style={{
                        background:
                          viewMode === "list"
                            ? "rgba(255,255,255,0.2)"
                            : "transparent",
                        borderColor: "rgba(255,255,255,0.3)",
                        color: "white",
                      }}
                    />
                  </Button.Group>
                </div>
              </Col>

              {/* Refresh & Filters */}
              <Col xs={12} md={3} lg={2}>
                <div className="filter-group">
                  <Text className="filter-label">Action</Text>
                  <Space.Compact style={{ width: "100%" }}>
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={handleRefresh}
                      size="middle"
                      style={{
                        background: "rgba(255,255,255,0.1)",
                        borderColor: "rgba(255,255,255,0.3)",
                        color: "white",
                        width: "100%",
                      }}
                      aria-label="Refresh products"
                    />
                    <Button
                      size="middle"
                      onClick={() => setShowFilters((p) => !p)}
                      style={{
                        background: showFilters
                          ? "rgba(255,255,255,0.25)"
                          : "rgba(255,255,255,0.1)",
                        borderColor: "rgba(255,255,255,0.3)",
                        color: "white",
                        fontWeight: 600,
                        width: 100,
                      }}
                    >
                      {showFilters ? "Hide" : "Filters"}
                    </Button>
                  </Space.Compact>
                </div>
              </Col>
            </Row>
            {showFilters && (
              <div
                style={{
                  marginTop: 20,
                  background: "rgba(255,255,255,0.15)",
                  padding: 18,
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.2)",
                }}
              >
                <Row gutter={[24, 24]}>
                  <Col xs={24} md={12} lg={8}>
                    <Text
                      style={{
                        color: "white",
                        fontWeight: 600,
                        display: "block",
                        marginBottom: 8,
                      }}
                    >
                      Price Range
                    </Text>
                    <Slider
                      range
                      min={priceRange[0]}
                      max={priceRange[1] || 0}
                      tooltip={{ formatter: (val) => formatCurrency(val) }}
                      value={selectedPriceRange}
                      onChange={setSelectedPriceRange}
                    />
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        color: "white",
                        fontSize: 12,
                      }}
                    >
                      <span>{formatCurrency(selectedPriceRange[0])}</span>
                      <span>{formatCurrency(selectedPriceRange[1])}</span>
                    </div>
                  </Col>
                  <Col xs={24} md={12} lg={6}>
                    <Text
                      style={{
                        color: "white",
                        fontWeight: 600,
                        display: "block",
                        marginBottom: 8,
                      }}
                    >
                      Minimum Rating
                    </Text>
                    <Rate
                      allowClear
                      value={minRating}
                      onChange={setMinRating}
                    />
                  </Col>
                  <Col xs={24} md={12} lg={5}>
                    <Text
                      style={{
                        color: "white",
                        fontWeight: 600,
                        display: "block",
                        marginBottom: 8,
                      }}
                    >
                      Flags
                    </Text>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      <Checkbox
                        style={{ color: "white" }}
                        checked={onlyOnSale}
                        onChange={(e) => setOnlyOnSale(e.target.checked)}
                      >
                        On Sale
                      </Checkbox>
                      <Checkbox
                        style={{ color: "white" }}
                        checked={onlyInStock}
                        onChange={(e) => setOnlyInStock(e.target.checked)}
                      >
                        In Stock
                      </Checkbox>
                    </div>
                  </Col>
                  <Col xs={24} md={12} lg={5}>
                    <Text
                      style={{
                        color: "white",
                        fontWeight: 600,
                        display: "block",
                        marginBottom: 8,
                      }}
                    >
                      Quick Actions
                    </Text>
                    <Space wrap>
                      <Button
                        size="small"
                        onClick={() => {
                          setSelectedPriceRange(priceRange);
                          setMinRating(0);
                          setOnlyOnSale(false);
                          setOnlyInStock(false);
                        }}
                      >
                        Reset Filters
                      </Button>
                    </Space>
                  </Col>
                </Row>
              </div>
            )}
          </div>

          {/* Results Summary */}
          {!loading && (
            <div
              style={{
                textAlign: "center",
                marginTop: "20px",
                background: "rgba(255,255,255,0.1)",
                backdropFilter: "blur(10px)",
                padding: "14px 16px",
                borderRadius: "14px",
                border: "1px solid rgba(255,255,255,0.18)",
              }}
            >
              <Text
                style={{
                  color: "white",
                  fontSize: "18px",
                  fontWeight: "600",
                }}
              >
                {displayedProducts.length === 0 ? (
                  "No products found"
                ) : (
                  <>
                    Found{" "}
                    <span
                      style={{
                        color: "#fbbf24",
                        fontWeight: "800",
                        fontSize: "20px",
                      }}
                    >
                      {displayedProducts.length}
                    </span>{" "}
                    amazing products
                    {selectedCategory && (
                      <span style={{ opacity: 0.9 }}>
                        {" "}
                        in "{selectedCategory}"{" "}
                        {/* Directly use category name */}
                      </span>
                    )}
                    {searchTerm && (
                      <span style={{ opacity: 0.9 }}>
                        {" "}
                        matching "{searchTerm}"
                      </span>
                    )}
                  </>
                )}
              </Text>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "40px 20px", // reduced vertical padding
        }}
      >
        {loading ? (
          <div
            style={{
              textAlign: "center",
              padding: "120px 40px",
              background: "white",
              borderRadius: "24px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
            }}
          >
            <Spin size="large" />
            <div style={{ marginTop: "24px" }}>
              <Title
                level={3}
                style={{
                  color: "#64748b",
                  fontWeight: "600",
                  margin: "16px 0 8px",
                }}
              >
                Loading Products
              </Title>
              <Text style={{ color: "#94a3b8", fontSize: "16px" }}>
                Discovering amazing products just for you...
              </Text>
            </div>
          </div>
        ) : products.length > 0 ? (
          <>
            {/* Grid View */}
            {viewMode === "grid" && (
              <Row gutter={[20, 28]}>
                {displayedProducts.map((p) => (
                  <Col xs={24} sm={12} md={8} lg={6} xl={6} key={p.id}>
                    <GridProductCard
                      product={p}
                      onView={(prod) => navigate(`/products/${prod.id}`)}
                      onAdd={addToCart}
                      wishlist={wishlist}
                      toggleWishlist={toggleWishlist}
                      formatCurrency={formatCurrency}
                      discountPercent={discountPercent}
                      getCategoryColor={getCategoryColor}
                    />
                  </Col>
                ))}
              </Row>
            )}

            {/* List View */}
            {viewMode === "list" && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 20 }}
              >
                {displayedProducts.map((p) => (
                  <ListProductCard
                    key={p.id}
                    product={p}
                    onView={(prod) => navigate(`/products/${prod.id}`)}
                    onAdd={addToCart}
                    wishlist={wishlist}
                    toggleWishlist={toggleWishlist}
                    formatCurrency={formatCurrency}
                    discountPercent={discountPercent}
                    getCategoryColor={getCategoryColor}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div
            style={{
              textAlign: "center",
              padding: "60px 32px",
              background: "white",
              borderRadius: "20px",
              boxShadow: "0 6px 28px rgba(0,0,0,0.06)",
            }}
          >
            <Empty
              description={
                <div>
                  <Title
                    level={3}
                    style={{
                      color: "#64748b",
                      fontWeight: "600",
                      margin: "16px 0 8px",
                    }}
                  >
                    No Products Found
                  </Title>
                  <Text style={{ color: "#94a3b8", fontSize: "16px" }}>
                    Try adjusting your search criteria or browse all categories
                  </Text>
                </div>
              }
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
            <Button
              type="primary"
              size="large"
              onClick={() => {
                setSearchTerm("");
                setSelectedCategory(null);
                updateQueryParams({ search: null, category: null });
              }}
              style={{
                marginTop: "20px",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                border: "none",
                borderRadius: "10px",
                height: "44px",
                padding: "0 26px",
                fontWeight: "600",
              }}
            >
              Browse All Products
            </Button>
          </div>
        )}
      </div>

      {/* Custom CSS for modern effects */}
      <style jsx>{`
        .modern-search .ant-input-search .ant-input {
          border-radius: 10px !important;
          border: 1px solid rgba(255, 255, 255, 0.25) !important;
          background: rgba(255, 255, 255, 0.12) !important;
          color: white !important;
          backdrop-filter: blur(10px);
          height: 38px !important;
          font-size: 14px;
        }

        .modern-search .ant-input-search .ant-input::placeholder {
          color: rgba(255, 255, 255, 0.6) !important;
        }

        .modern-search .ant-input-search-button {
          border-radius: 0 10px 10px 0 !important;
          background: rgba(255, 255, 255, 0.18) !important;
          border: 1px solid rgba(255, 255, 255, 0.25) !important;
          backdrop-filter: blur(10px);
          height: 38px !important;
        }
        /* Fix subtle misalignment between input and button */
        .modern-search .ant-input-search {
          overflow: hidden;
          border-radius: 10px !important;
        }
        .modern-search .ant-input-search .ant-input {
          border-right: 0 !important;
          border-radius: 10px 0 0 10px !important;
        }
        .modern-search .ant-input-search .ant-input-group-addon {
          padding: 0 !important;
          background: transparent !important;
        }
        .modern-search .ant-input-search-button {
          border-left: 0 !important;
          box-shadow: none !important;
        }
        .modern-search .ant-input-search .ant-input,
        .modern-search .ant-input-search-button {
          line-height: 38px !important;
        }
        .modern-search .ant-input-search .ant-input:focus {
          box-shadow: none !important;
        }

        .modern-select .ant-select-selector {
          border-radius: 10px !important;
          border: 1px solid rgba(255, 255, 255, 0.25) !important;
          background: rgba(255, 255, 255, 0.12) !important;
          backdrop-filter: blur(10px);
          height: 38px !important;
        }

        .modern-select .ant-select-selection-placeholder {
          color: rgba(255, 255, 255, 0.6) !important;
        }

        .modern-select .ant-select-selection-item {
          color: white !important;
          line-height: 36px !important;
          font-size: 14px;
        }

        .modern-product-card:hover .product-overlay {
          opacity: 1 !important;
        }

        .modern-product-list-card:hover {
          transform: translateY(-4px) !important;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12) !important;
        }
        /* Alignment helpers */
        .filter-bar-row .filter-group {
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          height: 100%;
        }
        .filter-label {
          color: rgba(255, 255, 255, 0.8);
          font-size: 14px;
          font-weight: 600;
          margin: 0 0 6px;
          line-height: 1;
        }
        .filter-bar-row .ant-input-search,
        .filter-bar-row .ant-select,
        .filter-bar-row .ant-btn-group {
          align-self: stretch;
        }
        .modern-search .ant-input-search {
          display: flex;
          align-items: center;
        }
        .modern-search .ant-input-search .ant-input {
          height: 40px !important;
        }
        .modern-search .ant-input-search-button {
          height: 40px !important;
        }
        .modern-select .ant-select-selector {
          height: 40px !important;
        }
      `}</style>
    </div>
  );
};

export default ProductListPage;
