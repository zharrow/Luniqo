#!/bin/bash

# Script to migrate Owner pages from enterprise.id to useNursery()
# Phase 0: Multi-Site Architecture Migration

# Files to migrate (operational data level)
FILES=(
  "app/(owner)/owner/rooms/[id]/page.tsx"
  "app/(owner)/owner/tasks/page.tsx"
  "app/(owner)/owner/history/page.tsx"
  "app/(owner)/owner/haccp/children/page.tsx"
  "app/(owner)/owner/haccp/meals/page.tsx"
  "app/(owner)/owner/haccp/products/page.tsx"
  "app/(owner)/owner/haccp/suppliers/page.tsx"
  "app/(owner)/owner/haccp/temperatures/page.tsx"
  "app/(owner)/owner/haccp/non-compliances/page.tsx"
  "app/(owner)/owner/haccp/equipment/page.tsx"
  "app/(owner)/owner/haccp/documents/page.tsx"
)

# Files to SKIP (enterprise-level resources)
# - app/(owner)/owner/nurseries/page.tsx
# - app/(owner)/owner/users/page.tsx
# - app/(owner)/owner/dashboard/page.tsx

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Migrating: $file"

    # 1. Add useNursery import (after useRequireAuth import)
    sed -i.bak "s|import { useRequireAuth } from '@/lib/contexts/AuthContext'|import { useRequireAuth } from '@/lib/contexts/AuthContext'\nimport { useNursery } from '@/lib/contexts/NurseryContext'|" "$file"

    # 2. Add const { selectedNursery } = useNursery() (after session hook)
    sed -i.bak "s|const { session, isLoading: authLoading } = useRequireAuth|const { session, isLoading: authLoading } = useRequireAuth(['Owner'])\n  const { selectedNursery } = useNursery()|" "$file"

    # 3. Replace session.enterprise.id with selectedNursery.id
    sed -i.bak "s|session\.enterprise\.id|selectedNursery?.id|g" "$file"

    # 4. Replace session.enterprise?.id with selectedNursery?.id
    sed -i.bak "s|session\.enterprise\?\.id|selectedNursery?.id|g" "$file"

    # 5. Replace !session.enterprise with !selectedNursery
    sed -i.bak "s|!session\.enterprise|!selectedNursery|g" "$file"

    # 6. Replace session?.enterprise with selectedNursery
    sed -i.bak "s|session\?\.enterprise|selectedNursery|g" "$file"

    # Remove backup file
    rm "${file}.bak" 2>/dev/null

    echo "✓ Migrated: $file"
  else
    echo "⚠ Not found: $file"
  fi
done

echo ""
echo "Migration complete!"
echo ""
echo "Next steps:"
echo "1. Review the changes with: git diff"
echo "2. Test compilation: npm run build"
echo "3. Test the pages manually"
