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
          domaine: Database["public"]["Enums"]["domaine_parcours"]
          duree: string | null
          ecart_classification: string | null
          eligible_cpf: boolean | null
          etats: Json
          financements_acceptes: string[] | null
          format: Database["public"]["Enums"]["format_parcours"] | null
          id: string
          infos_applicables: number
          infos_renseignees: number
          lieu: string | null
          modalites_paiement: string | null
          motif_regroupement: string | null
          niveau_entree: Database["public"]["Enums"]["niveau_entree"] | null
          nom: string
          non_couvert: string[] | null
          organisme_id: string
          outils_enseignes: string[] | null
          parcours_parent_id: string | null
          prerequis: string | null
          prix_max: number | null
          prix_min: number | null
          programme: Json | null
          site_officiel: string | null
          slug: string
          source_information: string | null
          statut_regroupement: Database["public"]["Enums"]["statut_regroupement"]
          sujet_principal: string
          updated_at: string
          volume_horaire: number | null
        }
        Insert: {
          certification?: string | null
          code_rncp_rs?: string | null
          competences_couvertes?: string[]
          created_at?: string
          date_verification?: string | null
          domaine: Database["public"]["Enums"]["domaine_parcours"]
          duree?: string | null
          ecart_classification?: string | null
          eligible_cpf?: boolean | null
          etats?: Json
          financements_acceptes?: string[] | null
          format?: Database["public"]["Enums"]["format_parcours"] | null
          id?: string
          infos_applicables?: number
          infos_renseignees?: number
          lieu?: string | null
          modalites_paiement?: string | null
          motif_regroupement?: string | null
          niveau_entree?: Database["public"]["Enums"]["niveau_entree"] | null
          nom: string
          non_couvert?: string[] | null
          organisme_id: string
          outils_enseignes?: string[] | null
          parcours_parent_id?: string | null
          prerequis?: string | null
          prix_max?: number | null
          prix_min?: number | null
          programme?: Json | null
          site_officiel?: string | null
          slug: string
          source_information?: string | null
          statut_regroupement?: Database["public"]["Enums"]["statut_regroupement"]
          sujet_principal: string
          updated_at?: string
          volume_horaire?: number | null
        }
        Update: {
          certification?: string | null
          code_rncp_rs?: string | null
          competences_couvertes?: string[]
          created_at?: string
          date_verification?: string | null
          domaine?: Database["public"]["Enums"]["domaine_parcours"]
          duree?: string | null
          ecart_classification?: string | null
          eligible_cpf?: boolean | null
          etats?: Json
          financements_acceptes?: string[] | null
          format?: Database["public"]["Enums"]["format_parcours"] | null
          id?: string
          infos_applicables?: number
          infos_renseignees?: number
          lieu?: string | null
          modalites_paiement?: string | null
          motif_regroupement?: string | null
          niveau_entree?: Database["public"]["Enums"]["niveau_entree"] | null
          nom?: string
          non_couvert?: string[] | null
          organisme_id?: string
          outils_enseignes?: string[] | null
          parcours_parent_id?: string | null
          prerequis?: string | null
          prix_max?: number | null
          prix_min?: number | null
          programme?: Json | null
          site_officiel?: string | null
          slug?: string
          source_information?: string | null
          statut_regroupement?: Database["public"]["Enums"]["statut_regroupement"]
          sujet_principal?: string
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
      format_parcours: "distanciel" | "presentiel" | "alternance" | "hybride"
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
      format_parcours: ["distanciel", "presentiel", "alternance", "hybride"],
      niveau_entree: ["aucun_prerequis", "bac2", "bac3", "experience"],
      statut_regroupement: ["autonome", "fusionne", "replie_arbitrage"],
    },
  },
} as const
