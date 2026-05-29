INSERT INTO clients (name, email, company, hourly_rate, currency) VALUES
  ('Sarah Johnson', 'sarah@designstudio.com', 'Design Studio Co.', 85.00, 'USD'),
  ('Marcus Lee', 'marcus@techventures.io', 'Tech Ventures Inc.', 120.00, 'USD'),
  ('Emma Wilson', 'emma@contentlab.co', 'ContentLab', 65.00, 'USD');

INSERT INTO projects (client_id, name, description, status, billing_type, agreed_amount) VALUES
  (1, 'Brand Redesign', 'Full visual identity overhaul including logo, typography, and color system', 'active', 'fixed', 4800.00),
  (1, 'Website Mockups', 'Hi-fi mockups for 5 page templates', 'completed', 'hourly', NULL),
  (2, 'API Integration', 'Connect CRM with billing system via REST API', 'active', 'hourly', NULL),
  (2, 'Technical Audit', 'Full codebase review and performance report', 'paused', 'fixed', 1500.00),
  (3, 'Blog Content Strategy', '3-month editorial calendar and 12 articles', 'active', 'fixed', 2400.00);

INSERT INTO time_entries (project_id, description, hours, logged_at) VALUES
  (1, 'Initial discovery call and mood board research', 3.5, NOW() - INTERVAL '45 days'),
  (1, 'Logo concepts — 3 directions', 6.0, NOW() - INTERVAL '40 days'),
  (1, 'Client feedback revisions round 1', 2.5, NOW() - INTERVAL '35 days'),
  (1, 'Typography and color system finalization', 4.0, NOW() - INTERVAL '25 days'),
  (1, 'Brand guidelines document', 5.5, NOW() - INTERVAL '15 days'),
  (2, 'Wireframes review and annotation', 4.0, NOW() - INTERVAL '60 days'),
  (2, 'Homepage hi-fi design', 7.0, NOW() - INTERVAL '50 days'),
  (2, 'Inner pages (4 templates)', 12.0, NOW() - INTERVAL '42 days'),
  (3, 'API documentation review', 2.0, NOW() - INTERVAL '30 days'),
  (3, 'Authentication flow implementation', 8.5, NOW() - INTERVAL '22 days'),
  (3, 'Webhook integration and error handling', 6.0, NOW() - INTERVAL '12 days'),
  (3, 'Testing and handoff documentation', 3.5, NOW() - INTERVAL '5 days'),
  (5, 'Audience research and competitor analysis', 4.0, NOW() - INTERVAL '20 days'),
  (5, 'Editorial calendar — months 1–3', 3.0, NOW() - INTERVAL '12 days'),
  (5, 'Articles 1–4 first drafts', 8.0, NOW() - INTERVAL '6 days');

INSERT INTO invoices (project_id, invoice_number, status, subtotal, notes, issued_at, due_at, paid_at) VALUES
  (2, 'FL-001', 'paid', 1955.00, 'Thank you for your business.', NOW() - INTERVAL '30 days', NOW() - INTERVAL '16 days', NOW() - INTERVAL '10 days'),
  (1, 'FL-002', 'sent', 2400.00, '50% milestone payment — brand identity phase complete.', NOW() - INTERVAL '14 days', NOW() - INTERVAL '1 day', NULL),
  (3, 'FL-003', 'draft', 1200.00, 'API integration phase 1 complete.', NOW() - INTERVAL '3 days', NOW() + INTERVAL '14 days', NULL);
