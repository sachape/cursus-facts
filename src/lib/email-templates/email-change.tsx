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

interface EmailChangeEmailProps {
  siteName: string;
  oldEmail: string;
  email: string;
  newEmail: string;
  confirmationUrl: string;
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Confirmez votre nouvelle adresse {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={marque}>{siteName}</Text>
        <Heading style={h1}>Confirmez votre nouvelle adresse</Heading>
        <Text style={text}>
          Un changement d&apos;adresse a été demandé sur votre compte {siteName}
          {oldEmail !== "" ? ` : de ${oldEmail} vers ${newEmail !== "" ? newEmail : email}` : ""}.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Confirmer le changement
        </Button>
        <Text style={footer}>
          Tant que ce lien n&apos;est pas ouvert, votre adresse actuelle reste inchangée. Si vous
          n&apos;êtes pas à l&apos;origine de cette demande, ignorez ce message.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default EmailChangeEmail;
