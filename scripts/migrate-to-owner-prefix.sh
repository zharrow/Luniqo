#!/bin/bash

echo "🔄 Migrating Owner routes to /owner/* prefix..."
echo ""

# Step 1: Update AppSidebar navigation links
echo "📝 Updating AppSidebar.tsx..."
sed -i '' "s|href: '/dashboard'|href: '/owner/dashboard'|g" components/layout/AppSidebar.tsx
sed -i '' "s|href: '/rooms'|href: '/owner/rooms'|g" components/layout/AppSidebar.tsx
sed -i '' "s|href: '/tasks'|href: '/owner/tasks'|g" components/layout/AppSidebar.tsx
sed -i '' "s|href: '/users'|href: '/owner/users'|g" components/layout/AppSidebar.tsx
sed -i '' "s|href: '/sessions'|href: '/owner/sessions'|g" components/layout/AppSidebar.tsx
sed -i '' "s|href: '/history'|href: '/owner/history'|g" components/layout/AppSidebar.tsx
sed -i '' "s|href: '/haccp'|href: '/owner/haccp'|g" components/layout/AppSidebar.tsx
sed -i '' "s|href: '/messages'|href: '/owner/messages'|g" components/layout/AppSidebar.tsx
sed -i '' "s|href: '/notifications'|href: '/owner/notifications'|g" components/layout/AppSidebar.tsx
sed -i '' "s|href: '/profil'|href: '/owner/profil'|g" components/layout/AppSidebar.tsx
echo "✓ AppSidebar.tsx updated"

# Step 2: Update Header profile link
echo "📝 Updating Header.tsx..."
sed -i '' "s|href=\"/profil\"|href=\"/owner/profil\"|g" components/layout/Header.tsx
echo "✓ Header.tsx updated"

# Step 3: Update AuthContext redirects
echo "📝 Updating AuthContext.tsx..."
sed -i '' "s|router.push('/dashboard')|router.push('/owner/dashboard')|g" lib/contexts/AuthContext.tsx
sed -i '' "s|router.replace('/dashboard')|router.replace('/owner/dashboard')|g" lib/contexts/AuthContext.tsx
echo "✓ AuthContext.tsx updated"

# Step 4: Update all href links in owner pages
echo "📝 Updating internal links in owner pages..."
find "app/(owner)/owner" -name "*.tsx" -type f -exec sed -i '' \
  -e 's|href="/dashboard"|href="/owner/dashboard"|g' \
  -e 's|href="/rooms|href="/owner/rooms|g' \
  -e 's|href="/users|href="/owner/users|g' \
  -e 's|href="/sessions|href="/owner/sessions|g' \
  -e 's|href="/tasks|href="/owner/tasks|g' \
  -e 's|href="/history|href="/owner/history|g' \
  -e 's|href="/messages|href="/owner/messages|g' \
  -e 's|href="/notifications|href="/owner/notifications|g' \
  -e 's|href="/profil|href="/owner/profil|g' \
  -e 's|href="/haccp|href="/owner/haccp|g' \
  {} \;
echo "✓ Owner pages updated"

# Step 5: Update router.push/replace calls
echo "📝 Updating router navigation calls..."
find "app/(owner)/owner" -name "*.tsx" -type f -exec sed -i '' \
  -e "s|router.push('/rooms|router.push('/owner/rooms|g" \
  -e "s|router.push('/messages|router.push('/owner/messages|g" \
  -e "s|router.replace('/dashboard')|router.replace('/owner/dashboard')|g" \
  {} \;
echo "✓ Router calls updated"

# Step 6: Update setup page redirect
echo "📝 Updating setup page..."
sed -i '' "s|router.push('/dashboard')|router.push('/owner/dashboard')|g" "app/(owner)/setup/page.tsx"
echo "✓ Setup page updated"

echo ""
echo "✅ Migration complete!"
echo ""
echo "New routes structure:"
echo "  /owner/dashboard"
echo "  /owner/rooms"
echo "  /owner/users"
echo "  /owner/sessions"
echo "  /owner/tasks"
echo "  /owner/history"
echo "  /owner/messages"
echo "  /owner/notifications"
echo "  /owner/profil"
echo "  /owner/haccp"
echo ""
