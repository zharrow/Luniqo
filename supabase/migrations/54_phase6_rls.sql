-- =============================================
-- Phase 6: Portail Parents - Row Level Security
-- Migration 54: RLS policies pour sécurité stricte
-- =============================================

-- ⚠️ CRITIQUE: Les parents doivent UNIQUEMENT voir leurs propres enfants
-- Fuite de données = violation RGPD grave

-- =============================================
-- ENABLE RLS
-- =============================================

ALTER TABLE timeline_post ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_comment ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_message ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_notification ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_document_share ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_acknowledgment ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_certificate ENABLE ROW LEVEL SECURITY;
ALTER TABLE caf_document ENABLE ROW LEVEL SECURITY;

-- =============================================
-- FONCTIONS HELPER POUR RLS
-- =============================================

-- Fonction : Obtenir guardian_id de l'utilisateur connecté
CREATE OR REPLACE FUNCTION public.guardian_id()
RETURNS UUID AS $$
BEGIN
  -- Récupérer guardian_id depuis guardian_user via auth.uid()
  RETURN (
    SELECT gu.guardian_id
    FROM guardian_user gu
    WHERE gu.id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction : Vérifier si l'utilisateur est un employé de la crèche
CREATE OR REPLACE FUNCTION public.is_employee_of_nursery(p_nursery_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles p
    LEFT JOIN employee_nursery_access ena ON ena.employee_id = p.id
    WHERE p.id = auth.uid()
      AND p.role = 'Employee'
      AND p.is_active = TRUE
      AND (
        p.enterprise_id = (SELECT enterprise_id FROM nursery WHERE id = p_nursery_id)
        OR ena.nursery_id = p_nursery_id
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction : Vérifier si l'utilisateur est owner de la crèche
CREATE OR REPLACE FUNCTION public.is_owner_of_nursery(p_nursery_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles p
    JOIN enterprise e ON e.owner_id = p.id
    JOIN nursery n ON n.enterprise_id = e.id
    WHERE p.id = auth.uid()
      AND p.role = 'Owner'
      AND p.is_active = TRUE
      AND n.id = p_nursery_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction : Vérifier si le guardian a accès à un enfant
CREATE OR REPLACE FUNCTION public.has_access_to_child(p_child_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM guardian_child gc
    WHERE gc.child_id = p_child_id
      AND gc.guardian_id = public.guardian_id()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction : Vérifier si le guardian a accès à une famille
CREATE OR REPLACE FUNCTION public.has_access_to_family(p_family_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM guardian g
    WHERE g.family_id = p_family_id
      AND g.id = public.guardian_id()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- RLS POLICIES: timeline_post
-- =============================================

-- Guardians: Voir posts de leurs enfants (publiés uniquement)
CREATE POLICY "Guardians can view published posts of their children"
ON timeline_post
FOR SELECT
TO authenticated
USING (
  is_visible_to_parents = TRUE
  AND public.has_access_to_child(child_id)
);

-- Employees: Voir tous les posts de leur crèche
CREATE POLICY "Employees can view all posts in their nursery"
ON timeline_post
FOR SELECT
TO authenticated
USING (public.is_employee_of_nursery(nursery_id));

-- Employees: Créer/modifier posts
CREATE POLICY "Employees can create posts"
ON timeline_post
FOR INSERT
TO authenticated
WITH CHECK (public.is_employee_of_nursery(nursery_id));

CREATE POLICY "Employees can update their posts"
ON timeline_post
FOR UPDATE
TO authenticated
USING (
  public.is_employee_of_nursery(nursery_id)
  AND (created_by_id = auth.uid() OR public.is_owner_of_nursery(nursery_id))
);

-- Employees: Supprimer posts
CREATE POLICY "Employees can delete their posts"
ON timeline_post
FOR DELETE
TO authenticated
USING (
  public.is_employee_of_nursery(nursery_id)
  AND (created_by_id = auth.uid() OR public.is_owner_of_nursery(nursery_id))
);

-- =============================================
-- RLS POLICIES: parent_comment
-- =============================================

-- Guardians: Voir commentaires sur posts de leurs enfants
CREATE POLICY "Guardians can view comments on their children's posts"
ON parent_comment
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM timeline_post tp
    WHERE tp.id = timeline_post_id
      AND public.has_access_to_child(tp.child_id)
  )
);

-- Guardians: Créer commentaires sur posts de leurs enfants
CREATE POLICY "Guardians can comment on their children's posts"
ON parent_comment
FOR INSERT
TO authenticated
WITH CHECK (
  guardian_id = public.guardian_id()
  AND EXISTS (
    SELECT 1 FROM timeline_post tp
    WHERE tp.id = timeline_post_id
      AND public.has_access_to_child(tp.child_id)
      AND tp.is_visible_to_parents = TRUE
  )
);

-- Guardians: Modifier/supprimer leurs propres commentaires
CREATE POLICY "Guardians can update their own comments"
ON parent_comment
FOR UPDATE
TO authenticated
USING (guardian_id = public.guardian_id());

CREATE POLICY "Guardians can delete their own comments"
ON parent_comment
FOR DELETE
TO authenticated
USING (guardian_id = public.guardian_id());

-- Employees: Voir/modérer tous les commentaires
CREATE POLICY "Employees can view all comments in their nursery"
ON parent_comment
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM timeline_post tp
    WHERE tp.id = timeline_post_id
      AND public.is_employee_of_nursery(tp.nursery_id)
  )
);

CREATE POLICY "Employees can moderate comments"
ON parent_comment
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM timeline_post tp
    WHERE tp.id = timeline_post_id
      AND public.is_employee_of_nursery(tp.nursery_id)
  )
);

-- =============================================
-- RLS POLICIES: parent_message
-- =============================================

-- Guardians: Voir messages de leur famille
CREATE POLICY "Guardians can view their family messages"
ON parent_message
FOR SELECT
TO authenticated
USING (
  (sender_guardian_id = public.guardian_id() OR recipient_guardian_id = public.guardian_id())
  AND public.has_access_to_family(family_id)
);

-- Guardians: Envoyer messages
CREATE POLICY "Guardians can send messages"
ON parent_message
FOR INSERT
TO authenticated
WITH CHECK (
  sender_guardian_id = public.guardian_id()
  AND public.has_access_to_family(family_id)
);

-- Employees: Voir messages de leur crèche
CREATE POLICY "Employees can view messages in their nursery"
ON parent_message
FOR SELECT
TO authenticated
USING (public.is_employee_of_nursery(nursery_id));

-- Employees: Envoyer messages
CREATE POLICY "Employees can send messages"
ON parent_message
FOR INSERT
TO authenticated
WITH CHECK (
  sender_employee_id = auth.uid()
  AND public.is_employee_of_nursery(nursery_id)
);

-- Marquer comme lu
CREATE POLICY "Users can update read status on their messages"
ON parent_message
FOR UPDATE
TO authenticated
USING (
  (recipient_guardian_id = public.guardian_id() AND public.has_access_to_family(family_id))
  OR (recipient_employee_id = auth.uid() AND public.is_employee_of_nursery(nursery_id))
);

-- =============================================
-- RLS POLICIES: parent_notification
-- =============================================

-- Guardians: Voir uniquement leurs notifications
CREATE POLICY "Guardians can view their own notifications"
ON parent_notification
FOR SELECT
TO authenticated
USING (guardian_id = public.guardian_id());

-- System/Employees: Créer notifications
CREATE POLICY "Employees can create notifications"
ON parent_notification
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM guardian g
    JOIN family f ON f.id = g.family_id
    JOIN child c ON c.family_id = f.id
    WHERE g.id = guardian_id
      AND (
        related_child_id IS NULL
        OR c.id = related_child_id
      )
  )
);

-- Guardians: Marquer comme lu
CREATE POLICY "Guardians can update their notifications"
ON parent_notification
FOR UPDATE
TO authenticated
USING (guardian_id = public.guardian_id());

-- =============================================
-- RLS POLICIES: parent_document_share
-- =============================================

-- Guardians: Voir documents partagés avec eux
CREATE POLICY "Guardians can view documents shared with them"
ON parent_document_share
FOR SELECT
TO authenticated
USING (
  is_published = TRUE
  AND (
    share_scope = 'all_families'
    OR (share_scope = 'specific_families' AND public.guardian_id() IN (
      SELECT g.id FROM guardian g WHERE g.family_id = ANY(family_ids)
    ))
    OR (share_scope = 'specific_child' AND public.has_access_to_child(child_id))
  )
);

-- Employees/Owners: Gérer documents
CREATE POLICY "Employees can manage documents in their nursery"
ON parent_document_share
FOR ALL
TO authenticated
USING (public.is_employee_of_nursery(nursery_id))
WITH CHECK (public.is_employee_of_nursery(nursery_id));

-- =============================================
-- RLS POLICIES: document_acknowledgment
-- =============================================

-- Guardians: Voir/gérer leurs acknowledgments
CREATE POLICY "Guardians can manage their acknowledgments"
ON document_acknowledgment
FOR ALL
TO authenticated
USING (guardian_id = public.guardian_id())
WITH CHECK (guardian_id = public.guardian_id());

-- Employees: Voir tous les acknowledgments
CREATE POLICY "Employees can view all acknowledgments in their nursery"
ON document_acknowledgment
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM parent_document_share pds
    WHERE pds.id = document_share_id
      AND public.is_employee_of_nursery(pds.nursery_id)
  )
);

-- =============================================
-- RLS POLICIES: tax_certificate
-- =============================================

-- Guardians: Voir certificats de leur famille
CREATE POLICY "Guardians can view their family tax certificates"
ON tax_certificate
FOR SELECT
TO authenticated
USING (
  public.has_access_to_family(family_id)
  AND status IN ('issued', 'sent', 'downloaded')
);

-- Employees/Owners: Gérer certificats
CREATE POLICY "Employees can manage tax certificates in their nursery"
ON tax_certificate
FOR ALL
TO authenticated
USING (public.is_employee_of_nursery(nursery_id))
WITH CHECK (public.is_employee_of_nursery(nursery_id));

-- =============================================
-- RLS POLICIES: caf_document
-- =============================================

-- Guardians: Voir documents CAF de leur famille
CREATE POLICY "Guardians can view their family CAF documents"
ON caf_document
FOR SELECT
TO authenticated
USING (
  public.has_access_to_family(family_id)
  AND status IN ('sent_to_family', 'sent_to_caf', 'validated')
);

-- Employees/Owners: Gérer documents CAF
CREATE POLICY "Employees can manage CAF documents in their nursery"
ON caf_document
FOR ALL
TO authenticated
USING (public.is_employee_of_nursery(nursery_id))
WITH CHECK (public.is_employee_of_nursery(nursery_id));

-- =============================================
-- COMMENTAIRES
-- =============================================

COMMENT ON POLICY "Guardians can view published posts of their children" ON timeline_post
IS 'CRITIQUE: Guardians voient UNIQUEMENT les posts publiés de LEURS enfants';

COMMENT ON POLICY "Guardians can view their family messages" ON parent_message
IS 'CRITIQUE: Guardians voient UNIQUEMENT les messages de LEUR famille';

COMMENT ON POLICY "Guardians can view their own notifications" ON parent_notification
IS 'CRITIQUE: Guardians voient UNIQUEMENT LEURS notifications';

COMMENT ON POLICY "Guardians can view documents shared with them" ON parent_document_share
IS 'Documents filtrés selon share_scope (all_families, specific_families, specific_child)';

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

-- Autoriser authenticated users à accéder aux tables
GRANT SELECT, INSERT, UPDATE ON timeline_post TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON parent_comment TO authenticated;
GRANT SELECT, INSERT, UPDATE ON parent_message TO authenticated;
GRANT SELECT, INSERT, UPDATE ON parent_notification TO authenticated;
GRANT SELECT ON parent_document_share TO authenticated;
GRANT SELECT, INSERT, UPDATE ON document_acknowledgment TO authenticated;
GRANT SELECT ON tax_certificate TO authenticated;
GRANT SELECT ON caf_document TO authenticated;

-- Autoriser service_role (backend) à tout faire
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
