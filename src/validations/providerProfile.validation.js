
"use strict";

const { z } = require("zod");

const text = (max) => z.string().trim().max(max).optional();
const list = z.array(z.string().trim().min(1).max(100)).max(40).optional();
const email = z.union([z.email().max(254), z.literal("")]).optional();
const website = z.union([
  z.literal(""),
  z.url().max(2048).refine(url => url.startsWith("https://"), {
    message: "Website must use HTTPS"
  })
]).optional();

// Only editable Provider.js fields are accepted. No D04 verification,
// account status, registration number, tax ID or D25 ratings are writable.
const providerProfileUpdateSchema = z.object({
  business_information: z.object({
    business_name: text(150),
    contact_email: email,
    contact_phone: text(30),
    business_address: text(300),
    website,
    description: text(2000)
  }).strict().optional(),
  experience: z.object({
    years_of_experience: z.number().int().min(0).max(100).optional(),
    qualifications: list,
    skills: list,
    bio: text(2000)
  }).strict().optional(),
  coverage_area: z.object({
    cities: list,
    regions: list,
    radius_km: z.number().finite().min(0).max(10000).optional()
  }).strict().optional()
}).strict().refine(
  data => Object.values(data).some(section =>
    section && Object.keys(section).length > 0),
  { message: "Provide at least one editable field" }
);

const providerVisibilitySchema = z.object({
  is_public: z.boolean().optional(),
  show_contact_email: z.boolean().optional(),
  show_contact_phone: z.boolean().optional(),
  show_business_address: z.boolean().optional(),
  show_website: z.boolean().optional(),
  show_experience: z.boolean().optional(),
  show_coverage_area: z.boolean().optional()
}).strict().refine(
  data => Object.keys(data).length > 0,
  { message: "Provide at least one visibility field" }
);

function toMongoSet(parsed) {
  const changes = {};
  for (const [group, fields] of Object.entries(parsed)) {
    for (const [key, value] of Object.entries(fields)) {
      changes[`${group}.${key}`] = value;
    }
  }
  return changes;
}

module.exports = {
  providerProfileUpdateSchema,
  providerVisibilitySchema,
  toMongoSet
};
