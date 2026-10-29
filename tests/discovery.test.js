const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const discoveryService = require("../src/services/discoveryService");
const discoveryController = require("../src/controllers/discoveryController");
const {
  searchServicesQuerySchema,
  providerDiscoveryQuerySchema,
  featuredQuerySchema
} = require("../src/validations/discoveryValidation");

// Helper to simulate express res
function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    }
  };
  return res;
}

describe("Developer 06 - Service Discovery Module Tests", () => {
  describe("Discovery Validation Schemas", () => {
    it("should validate and parse valid search query params", () => {
      const result = searchServicesQuerySchema.safeParse({
        q: "cleaning",
        city: "Colombo",
        minPrice: "2000",
        maxPrice: "10000",
        sortBy: "price_asc",
        page: "1",
        limit: "10"
      });

      assert.equal(result.success, true);
      assert.equal(result.data.q, "cleaning");
      assert.equal(result.data.minPrice, 2000);
      assert.equal(result.data.maxPrice, 10000);
      assert.equal(result.data.page, 1);
      assert.equal(result.data.limit, 10);
    });

    it("should reject when maxPrice is lower than minPrice", () => {
      const result = searchServicesQuerySchema.safeParse({
        minPrice: 5000,
        maxPrice: 2000
      });

      assert.equal(result.success, false);
      assert.equal(
        result.error.issues[0].message,
        "maxPrice must be greater than or equal to minPrice"
      );
    });

    it("should validate provider query schema with defaults", () => {
      const result = providerDiscoveryQuerySchema.safeParse({
        city: "Kandy"
      });

      assert.equal(result.success, true);
      assert.equal(result.data.city, "Kandy");
      assert.equal(result.data.sortBy, "rating_desc");
      assert.equal(result.data.page, 1);
      assert.equal(result.data.limit, 12);
    });

    it("should validate featured query schema limit", () => {
      const result = featuredQuerySchema.safeParse({
        limit: "4"
      });

      assert.equal(result.success, true);
      assert.equal(result.data.limit, 4);
    });
  });

  describe("DiscoveryService - Search & Filtering", () => {
    it("should return paginated services", async () => {
      const res = await discoveryService.searchServices({ page: 1, limit: 3 });

      assert.ok(Array.isArray(res.items));
      assert.equal(res.items.length, 3);
      assert.equal(res.pagination.page, 1);
      assert.equal(res.pagination.limit, 3);
      assert.ok(res.pagination.total >= 3);
      assert.ok(res.pagination.totalPages >= 1);
    });

    it("should filter services by search query keyword", async () => {
      const res = await discoveryService.searchServices({ q: "electrical" });

      assert.ok(res.items.length > 0);
      for (const item of res.items) {
        const matchesName = item.name.toLowerCase().includes("electrical");
        const matchesDesc = item.description.toLowerCase().includes("electrical");
        const matchesProvider = item.provider?.business_information?.business_name
          ?.toLowerCase()
          .includes("electrical");
        assert.ok(matchesName || matchesDesc || matchesProvider);
      }
    });

    it("should filter services by category slug", async () => {
      const res = await discoveryService.searchServices({ category: "cleaning" });

      assert.ok(res.items.length > 0);
      for (const item of res.items) {
        assert.equal(item.category.slug, "cleaning");
      }
    });

    it("should filter services by city / location", async () => {
      const res = await discoveryService.searchServices({ city: "Colombo" });

      assert.ok(res.items.length > 0);
      for (const item of res.items) {
        const hasCity =
          item.coverage?.supported_locations?.includes("Colombo") ||
          item.coverage?.coverage_area?.includes("Colombo");
        assert.ok(hasCity);
      }
    });

    it("should filter services by price range", async () => {
      const minPrice = 3000;
      const maxPrice = 6000;
      const res = await discoveryService.searchServices({ minPrice, maxPrice });

      assert.ok(res.items.length > 0);
      for (const item of res.items) {
        assert.ok(item.price.amount >= minPrice);
        assert.ok(item.price.amount <= maxPrice);
      }
    });

    it("should sort services by price ascending", async () => {
      const res = await discoveryService.searchServices({ sortBy: "price_asc", limit: 10 });

      assert.ok(res.items.length > 1);
      for (let i = 0; i < res.items.length - 1; i++) {
        assert.ok(res.items[i].price.amount <= res.items[i + 1].price.amount);
      }
    });

    it("should sort services by price descending", async () => {
      const res = await discoveryService.searchServices({ sortBy: "price_desc", limit: 10 });

      assert.ok(res.items.length > 1);
      for (let i = 0; i < res.items.length - 1; i++) {
        assert.ok(res.items[i].price.amount >= res.items[i + 1].price.amount);
      }
    });
  });

  describe("DiscoveryService - Providers Discovery", () => {
    it("should return providers with default sorting by rating", async () => {
      const res = await discoveryService.getProviders({ page: 1, limit: 10 });

      assert.ok(Array.isArray(res.items));
      assert.ok(res.items.length > 0);
      for (let i = 0; i < res.items.length - 1; i++) {
        assert.ok(res.items[i].rating_average >= res.items[i + 1].rating_average);
      }
    });

    it("should filter providers by city", async () => {
      const res = await discoveryService.getProviders({ city: "Kandy" });

      assert.ok(res.items.length > 0);
      for (const provider of res.items) {
        assert.ok(provider.coverage_area.cities.includes("Kandy"));
      }
    });

    it("should filter verified providers only", async () => {
      const res = await discoveryService.getProviders({ verifiedOnly: true });

      assert.ok(res.items.length > 0);
      for (const provider of res.items) {
        assert.equal(provider.verification_status, "Verified");
      }
    });
  });

  describe("DiscoveryService - Featured", () => {
    it("should return featured services, categories and top providers", async () => {
      const res = await discoveryService.getFeatured({ limit: 4 });

      assert.ok(Array.isArray(res.featuredServices));
      assert.ok(res.featuredServices.length <= 4);
      assert.ok(Array.isArray(res.categories));
      assert.ok(Array.isArray(res.topProviders));
    });
  });

  describe("DiscoveryController - HTTP Handlers", () => {
    it("should handle GET /api/discovery/search successfully", async () => {
      const req = { query: { q: "plumbing", limit: "5" } };
      const res = createMockRes();

      await discoveryController.search(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.pagination);
    });

    it("should return 400 when search query params are invalid", async () => {
      const req = { query: { minPrice: "10000", maxPrice: "2000" } };
      const res = createMockRes();

      await discoveryController.search(req, res);

      assert.equal(res.statusCode, 400);
      assert.equal(res.body.success, false);
      assert.ok(Array.isArray(res.body.errors));
    });

    it("should handle GET /api/discovery/providers successfully", async () => {
      const req = { query: { city: "Colombo", limit: "3" } };
      const res = createMockRes();

      await discoveryController.getProviders(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
    });

    it("should handle GET /api/discovery/featured successfully", async () => {
      const req = { query: { limit: "3" } };
      const res = createMockRes();

      await discoveryController.getFeatured(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.featuredServices);
      assert.ok(res.body.data.categories);
      assert.ok(res.body.data.topProviders);
    });
  });
});
