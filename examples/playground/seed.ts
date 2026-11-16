import type pg from "pg";

/** A small help center: some articles share words with likely questions, others only share meaning. */
export const articles = [
  ["Terminating your subscription", "To terminate your subscription, go to Settings → Billing and click End subscription. You keep access until the end of the billing period.", "billing"],
  ["Cancellation fees", "If you cancel before the end of an annual plan, a prorated early-termination fee applies.", "billing"],
  ["Changing your plan", "Upgrade or downgrade your plan anytime from Settings → Billing. Changes apply on the next invoice.", "billing"],
  ["Requesting a refund", "Refunds for annual plans are available within 14 days of purchase and take 5–10 business days to arrive.", "billing"],
  ["Pausing your account", "Not ready to leave? You can pause your account for up to 3 months instead of closing it.", "account"],
  ["Exporting your data", "Download all your projects as a ZIP from Settings → Data before closing your account.", "account"],
  ["Resetting your password", "Click 'Forgot password' on the sign-in page and follow the link we email you.", "account"],
  ["Enabling two-factor authentication", "Protect your account with an authenticator app under Settings → Security.", "account"],
  ["Error E1043 when paying", "E1043 means your card issuer declined the payment. Contact your bank or try another card.", "payments"],
  ["Error E2001 during checkout", "E2001 appears when the billing address doesn't match the card. Update your address and retry.", "payments"],
] as const;

/** Recreates `public.help_articles` (and drops its search data) so every run starts fresh. */
export async function seed(pool: pg.Pool) {
  await pool.query(`
    drop table if exists pgretrieve.help_articles;
    drop table if exists help_articles;
    create table help_articles (
      id bigserial primary key,
      title text not null,
      body text not null,
      category text not null
    );
  `);
  for (const [title, body, category] of articles) {
    await pool.query("insert into help_articles (title, body, category) values ($1, $2, $3)", [title, body, category]);
  }
}
