import * as React from "react";

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from "@react-email/components";

import { main, container, marque, h1, text, link, button, footer } from "./styles";

interface SignupEmailProps {
  siteName: string;
  siteUrl: string;
  recipient: string;
  confirmationUrl: string;
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Confirmez votre adresse pour {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Link href={siteUrl} style={marque}>
          {siteName}
        </Link>
        <Heading style={h1}>Confirmez votre adresse</Heading>
        <Text style={text}>
          Vous venez de créer un compte sur{" "}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          , le comparateur de formations e-commerce.
        </Text>
        <Text style={text}>
          Confirmez l&apos;adresse <strong>{recipient}</strong> pour retrouver vos formations, vos
          comparaisons et vos alertes.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Confirmer mon adresse
        </Button>
        <Text style={footer}>
          Si vous n&apos;êtes pas à l&apos;origine de cette inscription, ignorez simplement ce
          message : aucun compte ne sera activé.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default SignupEmail;
