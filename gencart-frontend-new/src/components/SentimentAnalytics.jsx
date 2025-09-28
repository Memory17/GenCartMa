import React, { useState, useEffect } from "react";
import {
  Row,
  Col,
  Card,
  Statistic,
  Typography,
  Table,
  Select,
  Button,
  message,
  Space,
  Tag,
} from "antd";
import { Pie, Column } from "@ant-design/plots";

const { Title } = Typography;
const { Option } = Select;

const SentimentAnalytics = () => {
  const [analyzing, setAnalyzing] = useState(false);
  const [viewMode, setViewMode] = useState("global"); // "global" | "product"
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [sentimentData, setSentimentData] = useState(null);
  const [trendsData, setTrendsData] = useState(null);
  const [alertsData, setAlertsData] = useState([]);

  // Fetch products for dropdown
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch(
          "http://localhost:8000/api/products/?no_pagination=true"
        );
        if (res.ok) {
          const data = await res.json();
          setProducts(data.results || []);
          if (data.results?.length > 0) {
            setSelectedProduct(data.results[0].id);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch products:", err);
      }
    };
    fetchProducts();
  }, []);

  // Fetch sentiment data
  const fetchSentimentData = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // Build API URLs
      const productParam =
        viewMode === "product" && selectedProduct
          ? `?product_id=${selectedProduct}`
          : "";
      const statsUrl = `http://localhost:8000/api/sentiment/statistics/${productParam}`;

      // Fetch statistics
      const statsRes = await fetch(statsUrl, { headers });
      if (!statsRes.ok) {
        throw new Error(`Statistics API failed: ${statsRes.status}`);
      }

      const statsJson = await statsRes.json();
      const statsData = statsJson.data || {};

      // Determine if we should use effective mode (rating fallback)
      const coverage = statsData.analysis_coverage || 0;
      const useEffective = coverage < 50;

      // Parse distribution data
      const sourceDistribution = useEffective
        ? statsData.effective_sentiment_distribution || []
        : statsData.sentiment_distribution || [];

      const counts = { positive: 0, neutral: 0, negative: 0 };
      sourceDistribution.forEach((item) => {
        const sentiment = (
          item.sentiment ||
          item.eff_sentiment ||
          ""
        ).toLowerCase();
        if (sentiment in counts) {
          counts[sentiment] = item.count || 0;
        }
      });

      const total = useEffective
        ? statsData.total_reviews || 0
        : statsData.analyzed_reviews || 0;

      const percents = {
        positive: total > 0 ? (counts.positive / total) * 100 : 0,
        neutral: total > 0 ? (counts.neutral / total) * 100 : 0,
        negative: total > 0 ? (counts.negative / total) * 100 : 0,
      };

      setSentimentData({
        counts,
        percents,
        total_reviews: total,
        analyzed_reviews: statsData.analyzed_reviews || 0,
        total_all_reviews: statsData.total_reviews || 0,
        unanalyzed_reviews: statsData.unanalyzed_reviews || 0,
        analysis_coverage: coverage,
        using_effective: useEffective,
      });

      // Fetch trends
      const mode = useEffective ? "effective" : "analyzed";
      const trendsParam =
        viewMode === "product" && selectedProduct
          ? `?days=30&mode=${mode}&product_id=${selectedProduct}`
          : `?days=30&mode=${mode}`;
      const trendsUrl = `http://localhost:8000/api/sentiment/trends/${trendsParam}`;

      const trendsRes = await fetch(trendsUrl, { headers });
      if (trendsRes.ok) {
        const trendsJson = await trendsRes.json();
        setTrendsData(trendsJson.data || null);
      }

      // Fetch alerts (mock for now)
      setAlertsData([
        {
          product_id: 1,
          name: "4K Monitor",
          negative_percent: 50.0,
          total_reviews: 2,
        },
        {
          product_id: 2,
          name: "Smartwatch",
          negative_percent: 100.0,
          total_reviews: 2,
        },
      ]);
    } catch (err) {
      console.error("Failed to fetch sentiment data:", err);
      message.error("Không thể tải dữ liệu sentiment");
    }
  };

  // Refetch data when view mode or selected product changes
  useEffect(() => {
    if (viewMode === "global" || (viewMode === "product" && selectedProduct)) {
      fetchSentimentData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, selectedProduct]);

  // Analyze all reviews
  const handleAnalyzeAll = async () => {
    setAnalyzing(true);
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        message.error("Vui lòng đăng nhập với quyền admin");
        return;
      }

      const res = await fetch(
        "http://localhost:8000/api/sentiment/analyze/all/",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ language: "en", model_type: "naive_bayes" }),
        }
      );

      if (!res.ok) {
        throw new Error(`Analyze failed: ${res.status}`);
      }

      message.success("Phân tích hoàn thành! Đang cập nhật dữ liệu...");
      await fetchSentimentData();
    } catch (err) {
      console.error("Analyze failed:", err);
      message.error("Phân tích thất bại");
    } finally {
      setAnalyzing(false);
    }
  };

  const selectedProductName =
    products.find((p) => p.id === selectedProduct)?.name || "Unknown Product";

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={3}>Sentiment Analytics</Title>

        <Space size="large" style={{ marginBottom: 16 }}>
          <Select
            value={viewMode}
            onChange={setViewMode}
            style={{ width: 120 }}
          >
            <Option value="global">Global</Option>
            <Option value="product">Per Product</Option>
          </Select>

          {viewMode === "product" && (
            <Select
              value={selectedProduct}
              onChange={setSelectedProduct}
              style={{ width: 200 }}
              placeholder="Chọn sản phẩm"
            >
              {products.map((product) => (
                <Option key={product.id} value={product.id}>
                  {product.name}
                </Option>
              ))}
            </Select>
          )}
        </Space>
      </div>

      {/* KPI Cards */}
      {sentimentData && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          {["positive", "neutral", "negative"].map((sentiment) => (
            <Col xs={24} sm={6} key={sentiment}>
              <Card
                size="small"
                style={{
                  borderTop: `4px solid ${
                    sentiment === "positive"
                      ? "#52c41a"
                      : sentiment === "negative"
                      ? "#ff4d4f"
                      : "#faad14"
                  }`,
                }}
              >
                <Statistic
                  title={sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
                  value={sentimentData.percents[sentiment].toFixed(1)}
                  suffix="%"
                  valueStyle={{
                    color:
                      sentiment === "positive"
                        ? "#52c41a"
                        : sentiment === "negative"
                        ? "#ff4d4f"
                        : "#faad14",
                  }}
                />
                <div style={{ marginTop: 6, color: "#888", fontSize: "12px" }}>
                  {sentimentData.counts[sentiment]} reviews
                </div>
              </Card>
            </Col>
          ))}

          <Col xs={24} sm={6}>
            <Card size="small">
              <Statistic
                title="Total Reviews"
                value={sentimentData.total_reviews}
              />
              <div style={{ marginTop: 6, color: "#888", fontSize: "12px" }}>
                {sentimentData.using_effective ? (
                  <Tag color="orange">Using rating fallback</Tag>
                ) : (
                  <Tag color="green">Using analyzed data</Tag>
                )}
              </div>
              <div style={{ marginTop: 6, color: "#888", fontSize: "12px" }}>
                Coverage: {sentimentData.analysis_coverage.toFixed(1)}%
                {sentimentData.unanalyzed_reviews > 0 && (
                  <div style={{ marginTop: 4 }}>
                    Unanalyzed: {sentimentData.unanalyzed_reviews}
                  </div>
                )}
              </div>
              {sentimentData.unanalyzed_reviews > 0 && (
                <Button
                  size="small"
                  type="primary"
                  style={{ marginTop: 8 }}
                  loading={analyzing}
                  onClick={handleAnalyzeAll}
                >
                  Analyze Remaining
                </Button>
              )}
            </Card>
          </Col>
        </Row>
      )}

      {/* Charts */}
      {sentimentData && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col xs={24} lg={10}>
            <Card title="Current Sentiment Distribution">
              <Pie
                data={[
                  { type: "Positive", value: sentimentData.counts.positive },
                  { type: "Neutral", value: sentimentData.counts.neutral },
                  { type: "Negative", value: sentimentData.counts.negative },
                ]}
                angleField="value"
                colorField="type"
                radius={0.9}
                label={{ type: "spider", content: "{name}: {percentage}" }}
                legend={{ position: "bottom" }}
                color={["#52c41a", "#faad14", "#ff4d4f"]}
              />
            </Card>
          </Col>

          <Col xs={24} lg={14}>
            {trendsData && trendsData.dates && trendsData.dates.length > 0 ? (
              <Card
                title={`Sentiment Distribution (30 days) - ${
                  viewMode === "product" ? selectedProductName : "Global"
                }`}
              >
                <Column
                  data={["positive", "neutral", "negative"].flatMap((sent) =>
                    trendsData.dates.map((date, i) => ({
                      date,
                      type: sent,
                      value: Number(trendsData[sent]?.[i] || 0),
                    }))
                  )}
                  xField="date"
                  yField="value"
                  seriesField="type"
                  isStack
                  isPercent
                  height={280}
                  color={["#52c41a", "#faad14", "#ff4d4f"]}
                  tooltip={{
                    formatter: (datum) => ({
                      name: datum.type,
                      value: `${(datum.value * 100).toFixed(1)}%`,
                    }),
                  }}
                />
              </Card>
            ) : (
              <Card
                title={`Sentiment Distribution (30 days) - ${
                  viewMode === "product" ? selectedProductName : "Global"
                }`}
              >
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    color: "#999",
                  }}
                >
                  No trend data available
                </div>
              </Card>
            )}
          </Col>
        </Row>
      )}

      {/* Alerts Table */}
      <Card title="Negative Sentiment Alerts">
        {alertsData.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px", color: "#999" }}>
            No products over negative threshold
          </div>
        ) : (
          <Table
            dataSource={alertsData}
            pagination={false}
            size="small"
            columns={[
              { title: "Product", dataIndex: "name", key: "name" },
              {
                title: "Negative %",
                dataIndex: "negative_percent",
                key: "negative_percent",
                render: (value) => `${value.toFixed(1)}%`,
              },
              {
                title: "Reviews",
                dataIndex: "total_reviews",
                key: "total_reviews",
              },
            ]}
            rowKey="product_id"
          />
        )}
      </Card>
    </div>
  );
};

export default SentimentAnalytics;
