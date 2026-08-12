import * as React from "react";

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from "@react-email/components";

import { main, container, marque, h1, text, button, footer } from "./styles";

interface RecoveryEmailProps {
  siteName: string;
  confirmationUrl: string;
}

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Réinitialisez votre mot de passe {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={marque}>{siteName}</Text>
        <Heading style={h1}>Réinitialiser votre mot de passe</Heading>
        <Text style={text}>
          Une réinitialisation de mot de passe a été demandée pour votre compte {siteName}.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Choisir un nouveau mot de passe
        </Button>
        <Text style={footer}>
          Ce lien est à usage unique et expire rapidement. Si vous n&apos;avez rien demandé, votre
          mot de passe actuel reste valable — aucune action n&apos;est nécessaire.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default RecoveryEmail;
