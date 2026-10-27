const mongoose = require("mongoose");
const { Service, ServiceCategory, Provider } = require("../models");
const { mockServices, mockCategories, mockProviders } = require("../data/mockDiscoveryData");

class DiscoveryService {
  /**
   * Check if MongoDB connection is active
   */
  isDbConnected() {
    return mongoose.connection && mongoose.connection.readyState === 1;
  }

  /**
   * Search and filter services
   */
  async searchServices(params) {
    const {
      q,
      category,
      city,
      location,
      minPrice,
      maxPrice,
      pricingType,
      minRating,
      sortBy = "relevance",
      page = 1,
      limit = 12
    } = params;

    const loc = city || location;

    if (this.isDbConnected()) {
      return this._searchServicesDb({
        q,
        category,
        loc,
        minPrice,
        maxPrice,
        pricingType,
        minRating,
        sortBy,
        page,
        limit
      });
    }

    return this._searchServicesMock({
      q,
      category,
      loc,
      minPrice,
      maxPrice,
      pricingType,
      minRating,
      sortBy,
      page,
      limit
    });
  }

  /**
   * Database search implementation
   */
  async _searchServicesDb({
    q,
    category,
    loc,
    minPrice,
    maxPrice,
    pricingType,
    minRating,
    sortBy,
    page,
    limit
  }) {
    const query = { status: "Active" };

    if (q) {
      const regex = new RegExp(q, "i");
      query.$or = [{ name: regex }, { description: regex }];
    }

    if (category) {
      if (mongoose.Types.ObjectId.isValid(category)) {
        query.category_id = new mongoose.Types.ObjectId(category);
      } else {
        const foundCategory = await ServiceCategory.findOne({
          $or: [{ slug: category.toLowerCase() }, { name: new RegExp(`^${category}$`, "i") }]
        });
        if (foundCategory) {
          query.category_id = foundCategory._id;
        }
      }
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      query["price.amount"] = {};
      if (minPrice !== undefined) query["price.amount"].$gte = minPrice;
      if (maxPrice !== undefined) query["price.amount"].$lte = maxPrice;
    }

    if (pricingType) {
      query["price.pricing_type"] = pricingType;
    }

    if (loc) {
      const locRegex = new RegExp(loc, "i");
      const locationQuery = {
        $or: [
          { "coverage.supported_locations": locRegex },
          { "coverage.coverage_area": locRegex }
        ]
      };
      if (query.$or) {
        query.$and = [{ $or: query.$or }, locationQuery];
        delete query.$or;
      } else {
        query.$or = locationQuery.$or;
      }
    }

    // Determine sorting
    let sortObj = { created_at: -1 };
    if (sortBy === "price_asc") sortObj = { "price.amount": 1 };
    if (sortBy === "price_desc") sortObj = { "price.amount": -1 };
    if (sortBy === "newest") sortObj = { created_at: -1 };

    const total = await Service.countDocuments(query);
    const skip = (page - 1) * limit;

    let services = await Service.find(query)
      .populate("category_id", "name slug icon_url")
      .populate({
        path: "provider_id",
        select: "business_information rating_average rating_count verification_status coverage_area user_id",
        populate: {
          path: "user_id",
          select: "first_name last_name profile_image"
        }
      })
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .lean();

    // In-memory filter for provider rating if required
    if (minRating !== undefined) {
      services = services.filter((s) => (s.provider_id?.rating_average || 0) >= minRating);
    }

    // Sort by rating if requested
    if (sortBy === "rating_desc") {
      services.sort((a, b) => (b.provider_id?.rating_average || 0) - (a.provider_id?.rating_average || 0));
    }

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: services,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      isMock: false
    };
  }

  /**
   * Mock in-memory search implementation
   */
  _searchServicesMock({
    q,
    category,
    loc,
    minPrice,
    maxPrice,
    pricingType,
    minRating,
    sortBy,
    page,
    limit
  }) {
    let results = [...mockServices];

    if (q) {
      const term = q.toLowerCase();
      results = results.filter(
        (s) =>
          s.name.toLowerCase().includes(term) ||
          s.description.toLowerCase().includes(term) ||
          s.provider?.business_information?.business_name.toLowerCase().includes(term)
      );
    }

    if (category) {
      const catTerm = category.toLowerCase();
      results = results.filter(
        (s) =>
          s.category_id === category ||
          s.category?.slug.toLowerCase() === catTerm ||
          s.category?.name.toLowerCase() === catTerm
      );
    }

    if (loc) {
      const locTerm = loc.toLowerCase();
      results = results.filter((s) => {
        const areaMatch = s.coverage?.coverage_area?.toLowerCase().includes(locTerm);
        const cityMatch = s.coverage?.supported_locations?.some((c) =>
          c.toLowerCase().includes(locTerm)
        );
        return areaMatch || cityMatch;
      });
    }

    if (minPrice !== undefined) {
      results = results.filter((s) => s.price.amount >= minPrice);
    }

    if (maxPrice !== undefined) {
      results = results.filter((s) => s.price.amount <= maxPrice);
    }

    if (pricingType) {
      results = results.filter((s) => s.price.pricing_type === pricingType);
    }

    if (minRating !== undefined) {
      results = results.filter((s) => (s.provider?.rating_average || 0) >= minRating);
    }

    // Sorting
    if (sortBy === "price_asc") {
      results.sort((a, b) => a.price.amount - b.price.amount);
    } else if (sortBy === "price_desc") {
      results.sort((a, b) => b.price.amount - a.price.amount);
    } else if (sortBy === "rating_desc") {
      results.sort((a, b) => (b.provider?.rating_average || 0) - (a.provider?.rating_average || 0));
    } else if (sortBy === "newest") {
      results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    const total = results.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIdx = (page - 1) * limit;
    const paginatedItems = results.slice(startIdx, startIdx + limit);

    return {
      items: paginatedItems,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      isMock: true
    };
  }

  /**
   * Discover Providers
   */
  async getProviders(params) {
    const {
      q,
      city,
      category,
      minRating,
      verifiedOnly,
      sortBy = "rating_desc",
      page = 1,
      limit = 12
    } = params;

    if (this.isDbConnected()) {
      const query = { account_status: "Active" };

      if (q) {
        const regex = new RegExp(q, "i");
        query.$or = [
          { "business_information.business_name": regex },
          { "business_information.description": regex },
          { "experience.skills": regex }
        ];
      }

      if (city) {
        query["coverage_area.cities"] = new RegExp(city, "i");
      }

      if (minRating !== undefined) {
        query.rating_average = { $gte: minRating };
      }

      if (verifiedOnly) {
        query.verification_status = "Verified";
      }

      let sortObj = { rating_average: -1 };
      if (sortBy === "experience_desc") sortObj = { "experience.years_of_experience": -1 };
      if (sortBy === "newest") sortObj = { created_at: -1 };

      const total = await Provider.countDocuments(query);
      const skip = (page - 1) * limit;

      const providers = await Provider.find(query)
        .populate("user_id", "first_name last_name email phone_number profile_image")
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean();

      const totalPages = Math.ceil(total / limit) || 1;

      return {
        items: providers,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        },
        isMock: false
      };
    }

    // Fallback Mock
    let results = [...mockProviders];

    if (q) {
      const term = q.toLowerCase();
      results = results.filter(
        (p) =>
          p.business_information?.business_name.toLowerCase().includes(term) ||
          p.business_information?.description?.toLowerCase().includes(term) ||
          p.experience?.skills?.some((sk) => sk.toLowerCase().includes(term))
      );
    }

    if (city) {
      const cityTerm = city.toLowerCase();
      results = results.filter((p) =>
        p.coverage_area?.cities?.some((c) => c.toLowerCase().includes(cityTerm))
      );
    }

    if (minRating !== undefined) {
      results = results.filter((p) => (p.rating_average || 0) >= minRating);
    }

    if (verifiedOnly) {
      results = results.filter((p) => p.verification_status === "Verified");
    }

    if (sortBy === "experience_desc") {
      results.sort(
        (a, b) => (b.experience?.years_of_experience || 0) - (a.experience?.years_of_experience || 0)
      );
    } else if (sortBy === "newest") {
      results.reverse();
    } else {
      results.sort((a, b) => (b.rating_average || 0) - (a.rating_average || 0));
    }

    const total = results.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIdx = (page - 1) * limit;
    const paginatedItems = results.slice(startIdx, startIdx + limit);

    return {
      items: paginatedItems,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      isMock: true
    };
  }

  /**
   * Get Featured Services, Categories, and Top Providers
   */
  async getFeatured(params) {
    const { limit = 6, category } = params;

    if (this.isDbConnected()) {
      const serviceQuery = { status: "Active" };
      if (category && mongoose.Types.ObjectId.isValid(category)) {
        serviceQuery.category_id = new mongoose.Types.ObjectId(category);
      }

      const [featuredServices, categories, topProviders] = await Promise.all([
        Service.find(serviceQuery)
          .populate("category_id", "name slug icon_url")
          .populate("provider_id", "business_information rating_average rating_count verification_status")
          .limit(limit)
          .lean(),
        ServiceCategory.find({ status: "Active" }).limit(8).lean(),
        Provider.find({ account_status: "Active", verification_status: "Verified" })
          .sort({ rating_average: -1 })
          .limit(4)
          .populate("user_id", "first_name last_name profile_image")
          .lean()
      ]);

      return {
        featuredServices,
        categories,
        topProviders,
        isMock: false
      };
    }

    // Mock fallback
    let services = [...mockServices];
    if (category) {
      services = services.filter((s) => s.category?.slug === category || s.category_id === category);
    }

    return {
      featuredServices: services.slice(0, limit),
      categories: mockCategories,
      topProviders: mockProviders.filter((p) => p.verification_status === "Verified").slice(0, 4),
      isMock: true
    };
  }
}

module.exports = new DiscoveryService();
