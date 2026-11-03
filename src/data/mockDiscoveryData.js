/**
 * Mock data for ServiQ Service Discovery
 * Used as fallback when live MongoDB connection is not yet configured.
 */

const mockCategories = [
  {
    _id: "660c1a111111111111111101",
    name: "Home Cleaning",
    slug: "cleaning",
    description: "Professional residential and commercial cleaning services",
    icon_url: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=120&q=80",
    status: "Active"
  },
  {
    _id: "660c1a111111111111111102",
    name: "Electrical Repairs",
    slug: "electrical",
    description: "Licensed electricians for installations, wiring, and repairs",
    icon_url: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=120&q=80",
    status: "Active"
  },
  {
    _id: "660c1a111111111111111103",
    name: "Plumbing Services",
    slug: "plumbing",
    description: "Expert leak detection, pipe fixing, and sanitary fittings",
    icon_url: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=120&q=80",
    status: "Active"
  },
  {
    _id: "660c1a111111111111111104",
    name: "AC Repair & Servicing",
    slug: "ac-repair",
    description: "Air conditioner servicing, chemical wash, gas charging and installation",
    icon_url: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=120&q=80",
    status: "Active"
  },
  {
    _id: "660c1a111111111111111105",
    name: "Carpentry & Furniture",
    slug: "carpentry",
    description: "Custom woodwork, furniture repairs, and door/window fittings",
    icon_url: "https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&w=120&q=80",
    status: "Active"
  },
  {
    _id: "660c1a111111111111111106",
    name: "Appliance Repair",
    slug: "appliance-repair",
    description: "Washing machines, refrigerators, microwave and TV repairs",
    icon_url: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=120&q=80",
    status: "Active"
  }
];

const mockProviders = [
  {
    _id: "660c2b222222222222222201",
    provider_type: "Individual",
    business_information: {
      business_name: "Sampath Electrical Works",
      contact_phone: "+94771234567",
      contact_email: "sampath.elec@gmail.com",
      business_address: "125 High Level Road, Nugegoda",
      description: "Certified electrician with over 10 years of experience in domestic and industrial installations."
    },
    user: {
      first_name: "Sampath",
      last_name: "Bandara",
      full_name: "Sampath Bandara",
      profile_image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80"
    },
    coverage_area: {
      cities: ["Colombo", "Nugegoda", "Maharagama", "Dehiwala", "Kotte"],
      regions: ["Western Province"],
      radius_km: 25
    },
    experience: {
      years_of_experience: 10,
      skills: ["Wiring", "Trip Switch Diagnostics", "Generator Maintenance", "Solar Setup"],
      qualifications: ["NVQ Level 4 - Electrical Technician"]
    },
    rating_average: 4.9,
    rating_count: 84,
    verification_status: "Verified",
    account_status: "Active"
  },
  {
    _id: "660c2b222222222222222202",
    provider_type: "Business",
    business_information: {
      business_name: "Lanka Clean Pro Solutions",
      contact_phone: "+94719876543",
      contact_email: "support@lankacleanpro.lk",
      business_address: "45 Galle Road, Colombo 03",
      description: "Premier cleaning team specializing in deep house cleaning, post-construction and carpet care."
    },
    user: {
      first_name: "Nadeeka",
      last_name: "Perera",
      full_name: "Nadeeka Perera",
      profile_image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80"
    },
    coverage_area: {
      cities: ["Colombo", "Gampaha", "Dehiwala", "Mount Lavinia", "Moratuwa"],
      regions: ["Western Province"],
      radius_km: 30
    },
    experience: {
      years_of_experience: 7,
      skills: ["Deep Cleaning", "Sofa Sanitization", "Window Cleaning", "Pest Disinfection"],
      qualifications: ["ISO Certified Hygiene Standards"]
    },
    rating_average: 4.8,
    rating_count: 112,
    verification_status: "Verified",
    account_status: "Active"
  },
  {
    _id: "660c2b222222222222222203",
    provider_type: "Business",
    business_information: {
      business_name: "CoolAir Engineers & Services",
      contact_phone: "+94755556677",
      contact_email: "info@coolairsl.com",
      business_address: "88 Peradeniya Road, Kandy",
      description: "Quick, reliable residential and commercial air conditioner maintenance and repairs."
    },
    user: {
      first_name: "Kasun",
      last_name: "Dissanayake",
      full_name: "Kasun Dissanayake",
      profile_image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80"
    },
    coverage_area: {
      cities: ["Kandy", "Peradeniya", "Katugastota", "Colombo"],
      regions: ["Central Province", "Western Province"],
      radius_km: 35
    },
    experience: {
      years_of_experience: 8,
      skills: ["Inverter AC Troubleshooting", "Gas Refilling", "Chemical Cleaning"],
      qualifications: ["HVAC Certified Specialist"]
    },
    rating_average: 4.7,
    rating_count: 49,
    verification_status: "Verified",
    account_status: "Active"
  },
  {
    _id: "660c2b222222222222222204",
    provider_type: "Individual",
    business_information: {
      business_name: "Rathnayake Plumbing & Water Systems",
      contact_phone: "+94762223344",
      contact_email: "rathnayake.plumb@gmail.com",
      business_address: "12 Main Street, Galle",
      description: "Fast response emergency plumber for pipe bursts, bathroom installations, and water pumps."
    },
    user: {
      first_name: "Sunil",
      last_name: "Rathnayake",
      full_name: "Sunil Rathnayake",
      profile_image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80"
    },
    coverage_area: {
      cities: ["Galle", "Matara", "Hikkaduwa", "Colombo"],
      regions: ["Southern Province", "Western Province"],
      radius_km: 40
    },
    experience: {
      years_of_experience: 12,
      skills: ["Pressure Pump Repair", "Leak Detection", "Bathroom Fittings"],
      qualifications: ["Licensed Master Plumber"]
    },
    rating_average: 4.6,
    rating_count: 36,
    verification_status: "Verified",
    account_status: "Active"
  }
];

const mockServices = [
  {
    _id: "660c3c333333333333333301",
    name: "Full House Deep Cleaning & Sanitization",
    description: "Complete top-to-bottom house cleaning including floor scrubbing, kitchen degreasing, bathroom descaling, and high-touch surface disinfection.",
    category_id: "660c1a111111111111111101",
    category: mockCategories[0],
    provider_id: "660c2b222222222222222202",
    provider: mockProviders[1],
    price: {
      amount: 8500,
      currency: "LKR",
      pricing_type: "Fixed"
    },
    coverage: {
      coverage_area: "Colombo & Suburbs",
      supported_locations: ["Colombo", "Dehiwala", "Nugegoda", "Kotte", "Moratuwa"],
      radius_km: 25
    },
    duration_minutes: 180,
    status: "Active",
    images: [
      "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1527515545081-5db817172677?auto=format&fit=crop&w=600&q=80"
    ],
    availability_info: "Monday - Saturday: 8:00 AM - 6:00 PM",
    created_at: new Date("2026-02-15T09:00:00Z")
  },
  {
    _id: "660c3c333333333333333302",
    name: "Emergency Electrical Breakdown & Wiring Repair",
    description: "Rapid troubleshooting for short circuits, circuit breaker tripping, burnt sockets, and general power failure diagnoses.",
    category_id: "660c1a111111111111111102",
    category: mockCategories[1],
    provider_id: "660c2b222222222222222201",
    provider: mockProviders[0],
    price: {
      amount: 2500,
      currency: "LKR",
      pricing_type: "Hourly"
    },
    coverage: {
      coverage_area: "Colombo District",
      supported_locations: ["Colombo", "Nugegoda", "Maharagama", "Kottawa"],
      radius_km: 20
    },
    duration_minutes: 60,
    status: "Active",
    images: [
      "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80"
    ],
    availability_info: "24/7 Emergency Assistance",
    created_at: new Date("2026-02-18T10:30:00Z")
  },
  {
    _id: "660c3c333333333333333303",
    name: "Inverter AC Full Chemical Master Service",
    description: "Deep chemical power wash for indoor evaporator coil and outdoor condenser, gas pressure check, and blower antibacterial treatment.",
    category_id: "660c1a111111111111111104",
    category: mockCategories[3],
    provider_id: "660c2b222222222222222203",
    provider: mockProviders[2],
    price: {
      amount: 4500,
      currency: "LKR",
      pricing_type: "Fixed"
    },
    coverage: {
      coverage_area: "Kandy & Colombo",
      supported_locations: ["Kandy", "Peradeniya", "Colombo"],
      radius_km: 30
    },
    duration_minutes: 90,
    status: "Active",
    images: [
      "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=600&q=80"
    ],
    availability_info: "Daily: 9:00 AM - 5:00 PM",
    created_at: new Date("2026-02-20T11:00:00Z")
  },
  {
    _id: "660c3c333333333333333304",
    name: "Pipe Leak Detection & Bathroom Plumbing Repair",
    description: "Fixing concealed water leaks, tap replacements, toilet flush mechanism repairs, and main line valve fixes.",
    category_id: "660c1a111111111111111103",
    category: mockCategories[2],
    provider_id: "660c2b222222222222222204",
    provider: mockProviders[3],
    price: {
      amount: 3200,
      currency: "LKR",
      pricing_type: "Fixed"
    },
    coverage: {
      coverage_area: "Galle & Colombo",
      supported_locations: ["Galle", "Matara", "Colombo"],
      radius_km: 30
    },
    duration_minutes: 75,
    status: "Active",
    images: [
      "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=600&q=80"
    ],
    availability_info: "Monday - Sunday: 7:30 AM - 7:00 PM",
    created_at: new Date("2026-02-22T08:00:00Z")
  },
  {
    _id: "660c3c333333333333333305",
    name: "Luxury Sofa & Upholstery Shampoo Deep Wash",
    description: "Industrial extraction cleaning removing stains, dust mites, and odors from fabric and leather couches and dining chairs.",
    category_id: "660c1a111111111111111101",
    category: mockCategories[0],
    provider_id: "660c2b222222222222222202",
    provider: mockProviders[1],
    price: {
      amount: 6500,
      currency: "LKR",
      pricing_type: "Fixed"
    },
    coverage: {
      coverage_area: "Colombo District",
      supported_locations: ["Colombo", "Dehiwala", "Mount Lavinia", "Rajagiriya"],
      radius_km: 20
    },
    duration_minutes: 120,
    status: "Active",
    images: [
      "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=600&q=80"
    ],
    availability_info: "Tuesday - Sunday: 9:00 AM - 6:00 PM",
    created_at: new Date("2026-02-25T14:00:00Z")
  },
  {
    _id: "660c3c333333333333333306",
    name: "Ceiling Fan & Chandelier Fitting with Concealed Wiring",
    description: "Safe ceiling mounting, speed regulator setup, and aesthetic wiring for modern light fittings and fans.",
    category_id: "660c1a111111111111111102",
    category: mockCategories[1],
    provider_id: "660c2b222222222222222201",
    provider: mockProviders[0],
    price: {
      amount: 1800,
      currency: "LKR",
      pricing_type: "Fixed"
    },
    coverage: {
      coverage_area: "Colombo",
      supported_locations: ["Colombo", "Nugegoda", "Battaramulla"],
      radius_km: 15
    },
    duration_minutes: 45,
    status: "Active",
    images: [
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80"
    ],
    availability_info: "Daily: 8:00 AM - 7:00 PM",
    created_at: new Date("2026-03-01T10:00:00Z")
  }
];

module.exports = {
  mockCategories,
  mockProviders,
  mockServices
};
