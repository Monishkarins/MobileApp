/**
 * Public product-enquiry / Request Demo types.
 *
 * Mirrors the web `/signup` (ProductEnquiryForm) contract against
 * POST /enquiry/submit and GET /product?featured=true. Field names are
 * dictated by the backend service — company and fleet size are folded into
 * `message` rather than stored as first-class columns.
 */

export type EnquirySubmitStatus =
  | 'LOGIN_REQUIRED'
  | 'OTP_SENT'
  | 'OTP_VERIFIED'
  | 'ENQUIRY_SUBMITTED';

/**
 * One endpoint serves OTP send, OTP verify, and final submit. Which fields are
 * present decides the branch on the server (see enquiryService.submitEnquiryService).
 */
export interface EnquirySubmitPayload {
  mobileNo: string;
  enquiryId?: number;
  otp?: string;
  name?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  /** Product ids from GET /product?featured=true — not titles. */
  selectedProducts?: Array<string | number>;
  /** Built as "Company: …\nFleet size: …" on the client, matching the web form. */
  message?: string;
}

export interface EnquirySubmitResponse {
  status: EnquirySubmitStatus;
  message: string;
  enquiryId?: number;
}

export interface FeaturedProduct {
  id: string | number;
  title: string;
  titleTag?: string;
  description?: string;
  /** Optional API icon blob — unused on mobile chips (letter badge avoids full bitmap decode). */
  icon?: string | null;
}

export interface FeaturedProductsResponse {
  result: FeaturedProduct[];
  productCount?: number;
}

/** Fleet size options for the signup / Request Demo form (en-dash, web parity). */
export const DEMO_FLEET_SIZES = [
  '1–10 vehicles',
  '11–50 vehicles',
  '51–200 vehicles',
  '200+ vehicles',
] as const;

export type DemoFleetSize = (typeof DEMO_FLEET_SIZES)[number];
