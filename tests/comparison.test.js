
const test = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const express = require("express");

const {
  ComparisonError,
  parseComparisonQuery,
  getProviderComparison
} = require("../src/services/comparisonService");

const createComparisonDataSource = require("../src/integrations/comparisonDataSource");
const createComparisonOwnerSource = require("../src/integrations/comparisonOwnerSource");
const createComparisonRoutes = require("../src/routes/comparisonRoutes");

const {
  PROVIDER_ACCOUNT_STATUSES,
  PROVIDER_VERIFICATION_STATUSES,
  SERVICE_STATUSES,
  PRICING_TYPES
} = require("../src/constants/enums");

const IDS = [
  "507f1f77bcf86cd799439011",
  "507f1f77bcf86cd799439012",
  "507f1f77bcf86cd799439013",
  "507f1f77bcf86cd799439014"
];

const CATEGORY_ID = "507f1f77bcf86cd799439021";
const OTHER_CATEGORY_ID = "507f1f77bcf86cd799439022";
const DATE = "2026-11-01";

function provider(id, overrides = {}) {
  return {
    _id: id,
    publicDisplayName: `Provider ${id.slice(-2)}`,
    provider_type: "Business",
    account_status: PROVIDER_ACCOUNT_STATUSES.ACTIVE,
    verification_status: PROVIDER_VERIFICATION_STATUSES.VERIFIED,
    experience: { years_of_experience: 5 },
    coverage_area: {
      cities: ["Colombo"],
      regions: ["Western"]
    },
    privateEmail: "private@example.com",
    ...overrides
  };
}

function service(id, providerId, amount, overrides = {}) {
  return {
    _id: id,
    provider_id: providerId,
    category_id: CATEGORY_ID,
    name: "Plumbing",
    status: SERVICE_STATUSES.ACTIVE,
    price: {
      amount,
      currency: "LKR",
      pricing_type: PRICING_TYPES.FIXED
    },
    ...overrides
  };
}

const services = [
  service("507f1f77bcf86cd799439031", IDS[0], 3000),
  service("507f1f77bcf86cd799439032", IDS[1], 4500, {
    name: " PLUMBING "
  }),
  service("507f1f77bcf86cd799439033", IDS[0], 9000, {
    name: "Painting"
  })
];

function ownerInterfaces(overrides = {}) {
  return {
    getProvidersByIds: async () => [
      provider(IDS[0]),
      provider(IDS[1])
    ],
    getServicesByProviderIds: async () => services,
    getRatingSummariesByProviderIds: async () => [
      {
        provider_id: IDS[0],
        average: 4.7,
        count: 12
      }
    ],
    getAvailabilitySummariesByProviderIds: async () => [
      {
        provider_id: IDS[0],
        date: DATE,
        status: "Available",
        isAvailable: true
      }
    ],
    ...overrides
  };
}

function query(overrides = {}) {
  return {
    ids: `${IDS[0]},${IDS[1]}`,
    categoryId: CATEGORY_ID,
    serviceName: "Plumbing",
    date: DATE,
    ...overrides
  };
}

async function comparison(filters = query(), overrides = {}) {
  const source = createComparisonDataSource(
    ownerInterfaces(overrides)
  );

  return getProviderComparison(filters, source);
}

async function withServer(overrides, callback) {
  const app = express();

  const options = {
    authenticate: (_req, _res, next) => next(),
    authorizeComparison: (_req, _res, next) => next(),
    ...ownerInterfaces(),
    ...overrides
  };

  app.use(
    "/api/compare",
    createComparisonRoutes(options)
  );

  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const url = `http://127.0.0.1:${server.address().port}/api/compare`;
    await callback(url);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
}

function urlWithQuery(url, filters = query()) {
  return `${url}?${new URLSearchParams(filters)}`;
}

// Input validation

test("accepts valid IDs and normalizes service and category", () => {
  const result = parseComparisonQuery(
    query({
      ids: ` ${IDS[0].toUpperCase()}, ${IDS[1]} `,
      categoryId: CATEGORY_ID.toUpperCase(),
      serviceName: "  PLUMBING   "
    })
  );

  assert.deepEqual(result.providerIds, IDS.slice(0, 2));
  assert.equal(result.categoryId, CATEGORY_ID);
  assert.equal(result.serviceName, "plumbing");
  assert.equal(result.date, DATE);
});

test("rejects missing, malformed and duplicate provider IDs", () => {
  assert.throws(
    () => parseComparisonQuery({}),
    ComparisonError
  );

  assert.throws(
    () => parseComparisonQuery({
      ids: `${IDS[0]},invalid`
    }),
    { status: 400 }
  );

  assert.throws(
    () => parseComparisonQuery({
      ids: `${IDS[0]},${IDS[0]}`
    }),
    /Duplicate providers/
  );
});

test("requires 2 to 3 providers by default", () => {
  assert.throws(
    () => parseComparisonQuery({ ids: IDS[0] }),
    { status: 400 }
  );

  const result = parseComparisonQuery({
    ids: IDS.slice(0, 3).join(",")
  });

  assert.equal(result.providerIds.length, 3);

  assert.throws(
    () => parseComparisonQuery({
      ids: IDS.join(",")
    }),
    { status: 400 }
  );
});

test("validates category, service name, and calendar date", () => {
  assert.throws(
    () => parseComparisonQuery(query({ categoryId: "bad" })),
    { status: 400 }
  );

  assert.throws(
    () => parseComparisonQuery(query({ categoryId: null })),
    { status: 400 }
  );

  assert.throws(
    () => parseComparisonQuery(query({ serviceName: " " })),
    { status: 400 }
  );

  assert.throws(
    () => parseComparisonQuery(query({
      serviceName: ["Plumbing"]
    })),
    { status: 400 }
  );

  assert.throws(
    () => parseComparisonQuery(query({
      date: "2026-02-30"
    })),
    { status: 400 }
  );
});

test("rejects invalid comparison-limit configuration", () => {
  assert.throws(
    () => parseComparisonQuery(query(), 1),
    /limit configuration/
  );
});

// Comparison business logic

test("compares the same service despite different provider service IDs", async () => {
  const result = await comparison(
    query({
      ids: `${IDS[1]},${IDS[0]}`
    })
  );

  assert.equal(result.success, true);
  assert.equal(result.data.count, 2);
  assert.equal(result.data.serviceName, "plumbing");

  assert.deepEqual(
    result.data.providers.map((item) => item.id),
    [IDS[1], IDS[0]]
  );

  assert.deepEqual(
    result.data.providers.map(
      (item) => item.services[0].price.amount
    ),
    [4500, 3000]
  );

  assert.equal(result.data.providers[1].services.length, 1);
});

test("does not leak private provider fields", async () => {
  const result = await comparison();

  assert.equal(
    Object.hasOwn(
      result.data.providers[0],
      "privateEmail"
    ),
    false
  );

  assert.deepEqual(
    result.data.providers[0].rating,
    { average: 4.7, count: 12 }
  );

  assert.equal(
    result.data.providers[0].availability.isAvailable,
    true
  );
});

test("excludes suspended providers", async () => {
  await assert.rejects(
    () => comparison(query(), {
      getProvidersByIds: async () => [
        provider(IDS[0]),
        provider(IDS[1], {
          account_status:
            PROVIDER_ACCOUNT_STATUSES.SUSPENDED
        })
      ]
    }),
    { status: 404 }
  );
});

test("excludes inactive services and unrelated categories", async () => {
  await assert.rejects(
    () => comparison(query(), {
      getServicesByProviderIds: async () => [
        services[0],
        {
          ...services[1],
          status: SERVICE_STATUSES.INACTIVE
        }
      ]
    }),
    { status: 404 }
  );

  await assert.rejects(
    () => comparison(query(), {
      getServicesByProviderIds: async () => [
        services[0],
        {
          ...services[1],
          category_id: OTHER_CATEGORY_ID
        }
      ]
    }),
    { status: 404 }
  );
});

test("rejects a provider without the requested service", async () => {
  await assert.rejects(
    () => comparison(query(), {
      getServicesByProviderIds: async () => [
        services[0],
        {
          ...services[1],
          name: "Electrical"
        }
      ]
    }),
    { status: 404 }
  );
});

test("returns null for missing ratings and unrequested availability", async () => {
  const result = await comparison(
    query({ date: undefined }),
    {
      getRatingSummariesByProviderIds: undefined,
      getAvailabilitySummariesByProviderIds: undefined
    }
  );

  assert.deepEqual(
    result.data.providers[0].rating,
    { average: null, count: null }
  );

  assert.equal(
    result.data.providers[0].availability,
    null
  );
});

// Owner-data integration

test("rejects missing or malformed required owner interfaces", async () => {
  const source = createComparisonDataSource();

  await assert.rejects(
    () => getProviderComparison(query(), source),
    { status: 503 }
  );

  await assert.rejects(
    () => comparison(query(), {
      getServicesByProviderIds: async () => null
    }),
    { status: 503 }
  );
});

test("owner source refuses to run without its configured interface", async () => {
  await assert.rejects(
    () => createComparisonOwnerSource()({
      providerIds: IDS.slice(0, 2)
    }),
    { status: 503 }
  );
});

// Route and authorization

test("route factory rejects missing authentication and authorization", () => {
  assert.throws(
    () => createComparisonRoutes(),
    /Authentication and comparison authorization/
  );
});

test("HTTP returns a public 200 comparison", async () => {
  await withServer({}, async (url) => {
    const response = await fetch(urlWithQuery(url));
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.data.count, 2);

    assert.deepEqual(
      body.data.providers.map(
        (item) => item.services[0].price.amount
      ),
      [3000, 4500]
    );
  });
});

test("HTTP returns 400 for duplicate IDs without reading provider data", async () => {
  let wasCalled = false;

  await withServer(
    {
      getProvidersByIds: async () => {
        wasCalled = true;
        return [];
      }
    },
    async (url) => {
      const response = await fetch(
        urlWithQuery(
          url,
          query({
            ids: `${IDS[0]},${IDS[0]}`
          })
        )
      );

      assert.equal(response.status, 400);
      assert.equal(wasCalled, false);
    }
  );
});

test("HTTP rejects unauthenticated and unauthorized requests", async () => {
  for (const [guard, status] of [
    ["authenticate", 401],
    ["authorizeComparison", 403]
  ]) {
    let wasCalled = false;

    await withServer(
      {
        [guard]: (_req, res) =>
          res.status(status).json({
            success: false
          }),

        getProvidersByIds: async () => {
          wasCalled = true;
          return [];
        }
      },
      async (url) => {
        const response = await fetch(urlWithQuery(url));

        assert.equal(response.status, status);
        assert.equal(wasCalled, false);
      }
    );
  }
});

test("HTTP returns 404 for a missing provider", async () => {
  await withServer(
    {
      getProvidersByIds: async () => [
        provider(IDS[0])
      ]
    },
    async (url) => {
      const response = await fetch(urlWithQuery(url));

      assert.equal(response.status, 404);
    }
  );
});

test("HTTP returns 503 when a required owner interface is missing", async () => {
  await withServer(
    {
      getServicesByProviderIds: undefined
    },
    async (url) => {
      const response = await fetch(urlWithQuery(url));

      assert.equal(response.status, 503);
    }
  );
});
