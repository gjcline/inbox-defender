-- EMERGENCY: Check label_mapping for system labels
-- This queries gmail_connections to verify NO system labels are stored

SELECT
  user_id,
  email_address,
  label_mapping,
  is_active,
  created_at
FROM gmail_connections
WHERE is_active = true;

-- Check if any label_mapping contains system labels (TRASH, SPAM, etc.)
-- This should return NO rows if everything is safe
SELECT
  user_id,
  email_address,
  label_mapping
FROM gmail_connections
WHERE
  is_active = true
  AND (
    label_mapping::text LIKE '%TRASH%'
    OR label_mapping::text LIKE '%SPAM%'
    OR label_mapping::text LIKE '%IMPORTANT%'
    OR label_mapping::text LIKE '%STARRED%'
    OR label_mapping::text LIKE '%SENT%'
    OR label_mapping::text LIKE '%DRAFT%'
  );

-- If the above query returns rows, YOU HAVE A CRITICAL BUG
-- The label_mapping should ONLY contain Label_xxx format labels
