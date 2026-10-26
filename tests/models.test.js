const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const {
  User,
  Customer,
  Provider,
  ServiceCategory,
  Service,
  ProviderAvailability,
  Booking,
  Schedule,
  Communication,
  Payment,
  CommissionRule,
  Commission,
  Earnings,
  Payout,
  ServiceCompletion,
  Review,
  Dispute,
  DisputeEvidence,
  Notification,
  AuditLog
} = require("../src/models");

const constants = require("../src/constants");

describe("ServiQ Mongoose Models Verification", () => {
  it("should export all 20 models", () => {
    const models = [
      User,
      Customer,
      Provider,
      ServiceCategory,
      Service,
      ProviderAvailability,
      Booking,
      Schedule,
      Communication,
      Payment,
      CommissionRule,
      Commission,
      Earnings,
      Payout,
      ServiceCompletion,
      Review,
      Dispute,
      DisputeEvidence,
      Notification,
      AuditLog
    ];

    assert.equal(models.length, 20);
    models.forEach((model) => {
      assert.ok(model, "Model should be defined");
      assert.ok(model.schema, `Model ${model.modelName} should have a mongoose schema`);
    });
  });

  describe("Accounts Models", () => {
    it("User model should have required schema paths", () => {
      const paths = User.schema.paths;
      assert.ok(paths.first_name);
      assert.ok(paths.last_name);
      assert.ok(paths.email);
      assert.ok(paths.password);
      assert.ok(paths.user_role);
      assert.ok(paths.account_status);
      assert.ok(paths.created_at);
      assert.ok(paths.updated_at);
    });

    it("Customer model should implement 1:0..1 relationship with User (user_id unique FK)", () => {
      const paths = Customer.schema.paths;
      assert.ok(paths.user_id);
      assert.equal(paths.user_id.options.ref, "User");
      assert.equal(paths.user_id.options.unique, true);
      assert.ok(paths["profile_details.address.city"]);
      assert.ok(paths["preferences.language"]);
      assert.ok(paths.account_status);
    });

    it("Provider model should implement 1:0..1 relationship with User (user_id unique FK)", () => {
      const paths = Provider.schema.paths;
      assert.ok(paths.user_id);
      assert.equal(paths.user_id.options.ref, "User");
      assert.equal(paths.user_id.options.unique, true);
      assert.ok(paths.provider_type);
      assert.ok(paths["business_information.business_name"]);
      assert.ok(paths["experience.years_of_experience"]);
      assert.ok(paths["coverage_area.radius_km"]);
      assert.ok(paths.verification_status);
      assert.ok(paths.account_status);
    });
  });

  describe("Catalog and Availability Models", () => {
    it("ServiceCategory model should support self-referencing hierarchy", () => {
      const paths = ServiceCategory.schema.paths;
      assert.ok(paths.name);
      assert.ok(paths.parent_category_id);
      assert.equal(paths.parent_category_id.options.ref, "ServiceCategory");
      assert.ok(paths.status);
    });

    it("Service model should reference ServiceCategory and Provider", () => {
      const paths = Service.schema.paths;
      assert.ok(paths.provider_id);
      assert.equal(paths.provider_id.options.ref, "Provider");
      assert.ok(paths.category_id);
      assert.equal(paths.category_id.options.ref, "ServiceCategory");
      assert.ok(paths["price.amount"]);
      assert.ok(paths.status);
    });

    it("ProviderAvailability model should reference Provider and optionally Service", () => {
      const paths = ProviderAvailability.schema.paths;
      assert.ok(paths.provider_id);
      assert.equal(paths.provider_id.options.ref, "Provider");
      assert.ok(paths.service_id);
      assert.equal(paths.service_id.options.ref, "Service");
      assert.ok(paths.available_date);
      assert.ok(paths.start_time);
      assert.ok(paths.end_time);
      assert.ok(paths.status);
    });
  });

  describe("Booking and Communication Models", () => {
    it("Booking model should reference Customer, Provider, and Service", () => {
      const paths = Booking.schema.paths;
      assert.ok(paths.booking_reference);
      assert.ok(paths.customer_id);
      assert.equal(paths.customer_id.options.ref, "Customer");
      assert.ok(paths.provider_id);
      assert.equal(paths.provider_id.options.ref, "Provider");
      assert.ok(paths.service_id);
      assert.equal(paths.service_id.options.ref, "Service");
      assert.ok(paths.booking_status);
      assert.ok(paths.requested_at);
      assert.ok(paths.total_amount);
    });

    it("Schedule model should reference Booking", () => {
      const paths = Schedule.schema.paths;
      assert.ok(paths.booking_id);
      assert.equal(paths.booking_id.options.ref, "Booking");
      assert.ok(paths.scheduled_start);
      assert.ok(paths.scheduled_end);
      assert.ok(paths.schedule_status);
    });

    it("Communication model should reference sender, recipient, optional booking and service", () => {
      const paths = Communication.schema.paths;
      assert.ok(paths.sender_id);
      assert.equal(paths.sender_id.options.ref, "User");
      assert.ok(paths.recipient_id);
      assert.equal(paths.recipient_id.options.ref, "User");
      assert.ok(paths.booking_id);
      assert.equal(paths.booking_id.options.ref, "Booking");
      assert.ok(paths.service_id);
      assert.equal(paths.service_id.options.ref, "Service");
      assert.ok(paths.content);
      assert.ok(paths.communication_status);
      assert.ok(paths.sent_at);
    });
  });

  describe("Payments and Finance Models", () => {
    it("Payment model should reference Booking", () => {
      const paths = Payment.schema.paths;
      assert.ok(paths.payment_reference);
      assert.ok(paths.booking_id);
      assert.equal(paths.booking_id.options.ref, "Booking");
      assert.ok(paths.amount);
      assert.ok(paths.currency);
      assert.ok(paths.payment_method);
      assert.ok(paths.payment_status);
    });

    it("CommissionRule model should optionally reference ServiceCategory", () => {
      const paths = CommissionRule.schema.paths;
      assert.ok(paths.rule_name);
      assert.ok(paths.category_id);
      assert.equal(paths.category_id.options.ref, "ServiceCategory");
      assert.ok(paths.commission_type);
      assert.ok(paths.rate_or_fixed_amount);
      assert.ok(paths.effective_start);
      assert.ok(paths.rule_status);
    });

    it("Commission model should reference Payment (unique) and CommissionRule", () => {
      const paths = Commission.schema.paths;
      assert.ok(paths.payment_id);
      assert.equal(paths.payment_id.options.ref, "Payment");
      assert.equal(paths.payment_id.options.unique, true);
      assert.ok(paths.rule_id);
      assert.equal(paths.rule_id.options.ref, "CommissionRule");
      assert.ok(paths.gross_amount);
      assert.ok(paths.commission_amount);
      assert.ok(paths.commission_status);
    });

    it("Earnings model should link Payment, Commission, Booking, Provider, and Payout", () => {
      const paths = Earnings.schema.paths;
      assert.ok(paths.payment_id);
      assert.equal(paths.payment_id.options.ref, "Payment");
      assert.equal(paths.payment_id.options.unique, true);
      assert.ok(paths.commission_id);
      assert.equal(paths.commission_id.options.ref, "Commission");
      assert.equal(paths.commission_id.options.unique, true);
      assert.ok(paths.booking_id);
      assert.equal(paths.booking_id.options.ref, "Booking");
      assert.ok(paths.provider_id);
      assert.equal(paths.provider_id.options.ref, "Provider");
      assert.ok(paths.payout_id);
      assert.equal(paths.payout_id.options.ref, "Payout");
      assert.ok(paths.transaction_amount);
      assert.ok(paths.earnings_amount);
      assert.ok(paths.earnings_status);
    });

    it("Payout model should reference Provider", () => {
      const paths = Payout.schema.paths;
      assert.ok(paths.payout_reference);
      assert.ok(paths.provider_id);
      assert.equal(paths.provider_id.options.ref, "Provider");
      assert.ok(paths.payout_amount);
      assert.ok(paths.currency);
      assert.ok(paths.payout_method);
      assert.ok(paths.destination_ref);
      assert.ok(paths.payout_status);
    });
  });

  describe("Completion, Reviews, and Disputes Models", () => {
    it("ServiceCompletion model should reference Booking (unique)", () => {
      const paths = ServiceCompletion.schema.paths;
      assert.ok(paths.booking_id);
      assert.equal(paths.booking_id.options.ref, "Booking");
      assert.equal(paths.booking_id.options.unique, true);
      assert.ok(paths.current_status);
      assert.ok(paths.completion_confirmation);
      assert.ok(paths.review_eligibility);
    });

    it("Review model should reference Booking (unique), Customer, Provider, Service", () => {
      const paths = Review.schema.paths;
      assert.ok(paths.booking_id);
      assert.equal(paths.booking_id.options.ref, "Booking");
      assert.equal(paths.booking_id.options.unique, true);
      assert.ok(paths.customer_id);
      assert.equal(paths.customer_id.options.ref, "Customer");
      assert.ok(paths.provider_id);
      assert.equal(paths.provider_id.options.ref, "Provider");
      assert.ok(paths.service_id);
      assert.equal(paths.service_id.options.ref, "Service");
      assert.ok(paths.rating_value);
      assert.ok(paths.review_status);
    });

    it("Dispute model should reference Booking, User (raised_by), and optional reviewer, payment, earnings", () => {
      const paths = Dispute.schema.paths;
      assert.ok(paths.dispute_reference);
      assert.ok(paths.booking_id);
      assert.equal(paths.booking_id.options.ref, "Booking");
      assert.ok(paths.raised_by);
      assert.equal(paths.raised_by.options.ref, "User");
      assert.ok(paths.assigned_reviewer);
      assert.equal(paths.assigned_reviewer.options.ref, "User");
      assert.ok(paths.payment_id);
      assert.equal(paths.payment_id.options.ref, "Payment");
      assert.ok(paths.earnings_id);
      assert.equal(paths.earnings_id.options.ref, "Earnings");
      assert.ok(paths.dispute_category);
      assert.ok(paths.dispute_status);
    });

    it("DisputeEvidence model should reference Dispute and uploader", () => {
      const paths = DisputeEvidence.schema.paths;
      assert.ok(paths.dispute_id);
      assert.equal(paths.dispute_id.options.ref, "Dispute");
      assert.ok(paths.uploaded_by);
      assert.equal(paths.uploaded_by.options.ref, "User");
      assert.ok(paths.evidence_type);
      assert.ok(paths.evidence_reference);
    });
  });

  describe("System Models", () => {
    it("Notification model should reference recipient User", () => {
      const paths = Notification.schema.paths;
      assert.ok(paths.recipient_id);
      assert.equal(paths.recipient_id.options.ref, "User");
      assert.ok(paths.event_type);
      assert.ok(paths.channel);
      assert.ok(paths.message);
      assert.ok(paths.notification_status);
    });

    it("AuditLog model should reference actor User (optional)", () => {
      const paths = AuditLog.schema.paths;
      assert.ok(paths.actor_id);
      assert.equal(paths.actor_id.options.ref, "User");
      assert.ok(paths.event_type);
      assert.ok(paths.action);
      assert.ok(paths.resource_type);
      assert.ok(paths.outcome);
      assert.ok(paths.logged_at);
    });
  });

  describe("Model Document Instantiation & Default Generation", () => {
    it("should instantiate a valid Booking with auto-generated reference", async () => {
      const booking = new Booking({
        customer_id: new mongoose.Types.ObjectId(),
        provider_id: new mongoose.Types.ObjectId(),
        service_id: new mongoose.Types.ObjectId(),
        total_amount: 1500
      });
      await booking.validate();
      assert.ok(booking.booking_reference.startsWith("BKG-"));
      assert.equal(booking.booking_status, "Requested");
    });

    it("should instantiate a valid Payment with auto-generated reference", async () => {
      const payment = new Payment({
        booking_id: new mongoose.Types.ObjectId(),
        amount: 2500,
        payment_method: constants.PAYMENT_METHODS.CARD
      });
      await payment.validate();
      assert.ok(payment.payment_reference.startsWith("PAY-"));
      assert.equal(payment.payment_status, "Pending");
    });

    it("should instantiate a valid Dispute with auto-generated reference", async () => {
      const dispute = new Dispute({
        booking_id: new mongoose.Types.ObjectId(),
        raised_by: new mongoose.Types.ObjectId(),
        dispute_category: constants.DISPUTE_CATEGORIES.SERVICE_QUALITY,
        description: "Service did not match agreed description."
      });
      await dispute.validate();
      assert.ok(dispute.dispute_reference.startsWith("DSP-"));
      assert.equal(dispute.dispute_status, "Submitted");
    });
  });
});
