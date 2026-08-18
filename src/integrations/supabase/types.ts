export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      abonnements: {
        Row: {
          consentement: boolean
          consentement_le: string | null
          cree_le: string
          desabonne_le: string | null
          email: string
          id: string
          jeton_desabonnement: string
          parcours_ids: string[]
          source: string
        }
        Insert: {
          consentement?: boolean
          consentement_le?: string | null
          cree_le?: string
          desabonne_le?: string | null
          email: string
          id?: string
          jeton_desabonnement?: string
          parcours_ids?: string[]
          source: string
        }
        Update: {
          consentement?: boolean
          consentement_le?: string | null
          cree_le?: string
          desabonne_le?: string | null
          email?: string
          id?: string
          jeton_desabonnement?: string
          parcours_ids?: string[]
          source?: string
        }
        Relationships: []
      }
      alertes: {
        Row: {
          active: boolean
          champs_surveilles: string[]
          cree_le: string
          derniere_notification: string | null
          id: string
          parcours_id: string
          utilisateur_id: string
        }
        Insert: {
          active?: boolean
          champs_surveilles?: string[]
          cree_le?: string
          derniere_notification?: string | null
          id?: string
          parcours_id: string
          utilisateur_id: string
        }
        Update: {
          active?: boolean
          champs_surveilles?: string[]
          cree_le?: string
          derniere_notification?: string | null
          id?: string
          parcours_id?: string
          utilisateur_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alertes_utilisateur_id_fkey"
            columns: ["utilisateur_id"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
        ]
      }
      arbitrages: {
        Row: {
          auteur: string | null
          created_at: string
          date_decision: string | null
          decision: string | null
          id: string
          parcours_ids: string[]
          preuve_retenue: string | null
          regle_muette: string | null
        }
        Insert: {
          auteur?: string | null
          created_at?: string
          date_decision?: string | null
          decision?: string | null
          id?: string
          parcours_ids?: string[]
          preuve_retenue?: string | null
          regle_muette?: string | null
        }
        Update: {
          auteur?: string | null
          created_at?: string
          date_decision?: string | null
          decision?: string | null
          id?: string
          parcours_ids?: string[]
          preuve_retenue?: string | null
          regle_muette?: string | null
        }
        Relationships: []
      }
      comparaisons: {
        Row: {
          consulte_le: string | null
          cree_le: string
          id: string
          nom: string | null
          parcours_ids: string[]
          utilisateur_id: string
        }
        Insert: {
          consulte_le?: string | null
          cree_le?: string
          id?: string
          nom?: string | null
          parcours_ids: string[]
          utilisateur_id: string
        }
        Update: {
          consulte_le?: string | null
          cree_le?: string
          id?: string
          nom?: string | null
          parcours_ids?: string[]
          utilisateur_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comparaisons_utilisateur_id_fkey"
            columns: ["utilisateur_id"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
        ]
      }
      historique_champs: {
        Row: {
          champ: string
          citation: string | null
          etat_nouveau: string | null
          etat_precedent: string | null
          id: string
          modifie_le: string
          origine: string
          parcours_id: string
          source_url: string | null
          valeur_nouvelle: string | null
          valeur_precedente: string | null
        }
        Insert: {
          champ: string
          citation?: string | null
          etat_nouveau?: string | null
          etat_precedent?: string | null
          id?: string
          modifie_le?: string
          origine: string
          parcours_id: string
          source_url?: string | null
          valeur_nouvelle?: string | null
          valeur_precedente?: string | null
        }
        Update: {
          champ?: string
          citation?: string | null
          etat_nouveau?: string | null
          etat_precedent?: string | null
          id?: string
          modifie_le?: string
          origine?: string
          parcours_id?: string
          source_url?: string | null
          valeur_nouvelle?: string | null
          valeur_precedente?: string | null
        }
        Relationships: []
      }
      notifications_envoyees: {
        Row: {
          alerte_id: string
          envoye_le: string
          historique_id: string
          id: string
        }
        Insert: {
          alerte_id: string
          envoye_le?: string
          historique_id: string
          id?: string
        }
        Update: {
          alerte_id?: string
          envoye_le?: string
          historique_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_envoyees_alerte_id_fkey"
            columns: ["alerte_id"]
            isOneToOne: false
            referencedRelation: "alertes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_envoyees_historique_id_fkey"
            columns: ["historique_id"]
            isOneToOne: false
            referencedRelation: "historique_champs"
            referencedColumns: ["id"]
          },
        ]
      }
      organismes: {
        Row: {
          categorie: Database["public"]["Enums"]["categorie_organisme"]
          certifications_qualite: string[]
          created_at: string
          id: string
          nom: string
          site: string | null
          updated_at: string
        }
        Insert: {
          categorie: Database["public"]["Enums"]["categorie_organisme"]
          certifications_qualite?: string[]
          created_at?: string
          id?: string
          nom: string
          site?: string | null
          updated_at?: string
        }
        Update: {
          categorie?: Database["public"]["Enums"]["categorie_organisme"]
          certifications_qualite?: string[]
          created_at?: string
          id?: string
          nom?: string
          site?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      parcours: {
        Row: {
          certification: string | null
          code_rncp_rs: string | null
          competences_couvertes: string[]
          created_at: string
          date_verification: string | null
          dispo_inter: boolean | null
          dispo_intra: boolean | null
          domaine: Database["public"]["Enums"]["domaine_parcours"]
          duree: string | null
          ecart_classification: string | null
          eligible_cpf: boolean | null
          etats: Json
          financements_acceptes: string[] | null
          formats: Database["public"]["Enums"]["format_parcours"][]
          id: string
          infos_applicables: number
          infos_renseignees: number
          lieu: string | null
          modalite_acces: Database["public"]["Enums"]["modalite_acces"] | null
          modalites_paiement: string | null
          motif_regroupement: string | null
          niveau_entree: Database["public"]["Enums"]["niveau_entree"] | null
          nom: string
          non_couvert: string[] | null
          organisme_id: string
          outils_enseignes: string[] | null
          parcours_parent_id: string | null
          prerequis: string | null
          prix_intra: number | null
          prix_max: number | null
          prix_min: number | null
          prix_niveau: string | null
          profondeur: string
          profondeur_verifiee_le: string | null
          programme: Json | null
          site_officiel: string | null
          slug: string
          source_information: string | null
          source_modalite_acces: string | null
          statut_regroupement: Database["public"]["Enums"]["statut_regroupement"]
          sujet_principal: string
          unite_prix: string | null
          updated_at: string
          volume_horaire: number | null
        }
        Insert: {
          certification?: string | null
          code_rncp_rs?: string | null
          competences_couvertes?: string[]
          created_at?: string
          date_verification?: string | null
          dispo_inter?: boolean | null
          dispo_intra?: boolean | null
          domaine: Database["public"]["Enums"]["domaine_parcours"]
          duree?: string | null
          ecart_classification?: string | null
          eligible_cpf?: boolean | null
          etats?: Json
          financements_acceptes?: string[] | null
          formats?: Database["public"]["Enums"]["format_parcours"][]
          id?: string
          infos_applicables?: number
          infos_renseignees?: number
          lieu?: string | null
          modalite_acces?: Database["public"]["Enums"]["modalite_acces"] | null
          modalites_paiement?: string | null
          motif_regroupement?: string | null
          niveau_entree?: Database["public"]["Enums"]["niveau_entree"] | null
          nom: string
          non_couvert?: string[] | null
          organisme_id: string
          outils_enseignes?: string[] | null
          parcours_parent_id?: string | null
          prerequis?: string | null
          prix_intra?: number | null
          prix_max?: number | null
          prix_min?: number | null
          prix_niveau?: string | null
          profondeur?: string
          profondeur_verifiee_le?: string | null
          programme?: Json | null
          site_officiel?: string | null
          slug: string
          source_information?: string | null
          source_modalite_acces?: string | null
          statut_regroupement?: Database["public"]["Enums"]["statut_regroupement"]
          sujet_principal: string
          unite_prix?: string | null
          updated_at?: string
          volume_horaire?: number | null
        }
        Update: {
          certification?: string | null
          code_rncp_rs?: string | null
          competences_couvertes?: string[]
          created_at?: string
          date_verification?: string | null
          dispo_inter?: boolean | null
          dispo_intra?: boolean | null
          domaine?: Database["public"]["Enums"]["domaine_parcours"]
          duree?: string | null
          ecart_classification?: string | null
          eligible_cpf?: boolean | null
          etats?: Json
          financements_acceptes?: string[] | null
          formats?: Database["public"]["Enums"]["format_parcours"][]
          id?: string
          infos_applicables?: number
          infos_renseignees?: number
          lieu?: string | null
          modalite_acces?: Database["public"]["Enums"]["modalite_acces"] | null
          modalites_paiement?: string | null
          motif_regroupement?: string | null
          niveau_entree?: Database["public"]["Enums"]["niveau_entree"] | null
          nom?: string
          non_couvert?: string[] | null
          organisme_id?: string
          outils_enseignes?: string[] | null
          parcours_parent_id?: string | null
          prerequis?: string | null
          prix_intra?: number | null
          prix_max?: number | null
          prix_min?: number | null
          prix_niveau?: string | null
          profondeur?: string
          profondeur_verifiee_le?: string | null
          programme?: Json | null
          site_officiel?: string | null
          slug?: string
          source_information?: string | null
          source_modalite_acces?: string | null
          statut_regroupement?: Database["public"]["Enums"]["statut_regroupement"]
          sujet_principal?: string
          unite_prix?: string | null
          updated_at?: string
          volume_horaire?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "parcours_organisme_id_fkey"
            columns: ["organisme_id"]
            isOneToOne: false
            referencedRelation: "organismes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcours_parcours_parent_id_fkey"
            columns: ["parcours_parent_id"]
            isOneToOne: false
            referencedRelation: "parcours"
            referencedColumns: ["id"]
          },
        ]
      }
      profils: {
        Row: {
          cree_le: string
          derniere_connexion: string | null
          email: string
          id: string
        }
        Insert: {
          cree_le?: string
          derniere_connexion?: string | null
          email: string
          id: string
        }
        Update: {
          cree_le?: string
          derniere_connexion?: string | null
          email?: string
          id?: string
        }
        Relationships: []
      }
      sauvegardes: {
        Row: {
          cible_id: string
          cree_le: string
          id: string
          type: string
          utilisateur_id: string
        }
        Insert: {
          cible_id: string
          cree_le?: string
          id?: string
          type: string
          utilisateur_id: string
        }
        Update: {
          cible_id?: string
          cree_le?: string
          id?: string
          type?: string
          utilisateur_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sauvegardes_utilisateur_id_fkey"
            columns: ["utilisateur_id"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string
          date_debut: string | null
          id: string
          places: number | null
          tarif_promotionnel: number | null
          updated_at: string
          variante_id: string
          ville: string | null
        }
        Insert: {
          created_at?: string
          date_debut?: string | null
          id?: string
          places?: number | null
          tarif_promotionnel?: number | null
          updated_at?: string
          variante_id: string
          ville?: string | null
        }
        Update: {
          created_at?: string
          date_debut?: string | null
          id?: string
          places?: number | null
          tarif_promotionnel?: number | null
          updated_at?: string
          variante_id?: string
          ville?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "variantes"
            referencedColumns: ["id"]
          },
        ]
      }
      variantes: {
        Row: {
          accompagnement: string | null
          created_at: string
          duree: string | null
          id: string
          label: string
          parcours_id: string
          prix: number | null
          updated_at: string
          volume_horaire: number | null
        }
        Insert: {
          accompagnement?: string | null
          created_at?: string
          duree?: string | null
          id?: string
          label: string
          parcours_id: string
          prix?: number | null
          updated_at?: string
          volume_horaire?: number | null
        }
        Update: {
          accompagnement?: string | null
          created_at?: string
          duree?: string | null
          id?: string
          label?: string
          parcours_id?: string
          prix?: number | null
          updated_at?: string
          volume_horaire?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "variantes_parcours_id_fkey"
            columns: ["parcours_id"]
            isOneToOne: false
            referencedRelation: "parcours"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      categorie_organisme:
        | "universite"
        | "ecole"
        | "bootcamp"
        | "formation_professionnelle"
        | "certification_editeur"
        | "mooc_plateforme"
        | "formation_independante"
      domaine_parcours:
        | "ecommerce"
        | "marketplaces"
        | "publicite_payante"
        | "referencement"
        | "email_crm"
        | "data_conversion"
        | "creation_site"
        | "marketing_digital"
        | "commerce_vente"
      etat_information:
        | "renseigne"
        | "non_communique"
        | "non_applicable"
        | "a_confirmer"
      format_parcours: "distanciel" | "presentiel" | "alternance"
      modalite_acces:
        | "libre"
        | "compte_requis"
        | "compte_produit_requis"
        | "certificat_payant"
        | "freemium"
        | "pris_en_charge"
      niveau_entree: "aucun_prerequis" | "bac2" | "bac3" | "experience"
      statut_regroupement: "autonome" | "fusionne" | "replie_arbitrage"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      categorie_organisme: [
        "universite",
        "ecole",
        "bootcamp",
        "formation_professionnelle",
        "certification_editeur",
        "mooc_plateforme",
        "formation_independante",
      ],
      domaine_parcours: [
        "ecommerce",
        "marketplaces",
        "publicite_payante",
        "referencement",
        "email_crm",
        "data_conversion",
        "creation_site",
        "marketing_digital",
        "commerce_vente",
      ],
      etat_information: [
        "renseigne",
        "non_communique",
        "non_applicable",
        "a_confirmer",
      ],
      format_parcours: ["distanciel", "presentiel", "alternance"],
      modalite_acces: [
        "libre",
        "compte_requis",
        "compte_produit_requis",
        "certificat_payant",
        "freemium",
        "pris_en_charge",
      ],
      niveau_entree: ["aucun_prerequis", "bac2", "bac3", "experience"],
      statut_regroupement: ["autonome", "fusionne", "replie_arbitrage"],
    },
  },
} as const
