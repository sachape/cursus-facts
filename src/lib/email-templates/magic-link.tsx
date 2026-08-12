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

interface MagicLinkEmailProps {
  siteName: string;
  confirmationUrl: string;
}

export const MagicLinkEmail = ({ siteName, confirmationUrl }: MagicLinkEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre lien de connexion {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={marque}>{siteName}</Text>
        <Heading style={h1}>Votre lien de connexion</Heading>
        <Text style={text}>
          Cliquez ci-dessous pour vous connecter à {siteName}. Aucun mot de passe n&apos;est
          nécessaire.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Me connecter
        </Button>
        <Text style={footer}>
          Ce lien est à usage unique et expire rapidement. Si vous n&apos;avez pas demandé à vous
          connecter, ignorez ce message.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default MagicLinkEmail;
