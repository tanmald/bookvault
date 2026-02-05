#!/bin/bash
# Reset local Supabase database for clean test runs
# This deletes all test users and their data

echo "🧹 Resetting test database..."

# Connect to PostgreSQL and truncate auth users
# Note: This requires the postgres user password (default: postgres)
docker exec -i supabase_db_ProjectsCTW psql -U postgres -d postgres << EOF
-- Delete test users from auth schema
DELETE FROM auth.users WHERE email LIKE '%@test.local';

-- Clean up related data (cascading deletes should handle most)
DELETE FROM public.profiles WHERE email LIKE '%@test.local';

-- Clean up test libraries
DELETE FROM public.libraries WHERE name LIKE 'Test %';

-- Clean up test books
DELETE FROM public.books WHERE title LIKE 'Test Book%';
EOF

echo "✅ Test database reset complete"
echo ""
echo "You can now run tests: npm test"
