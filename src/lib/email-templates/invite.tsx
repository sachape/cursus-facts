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

interface InviteEmailProps {
  siteName: string;
  siteUrl: string;
  confirmationUrl: string;
}

export const InviteEmail = ({ siteName, siteUrl, confirmationUrl }: InviteEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Vous êtes invité à rejoindre {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Link href={siteUrl} style={marque}>
          {siteName}
        </Link>
        <Heading style={h1}>Vous êtes invité</Heading>
        <Text style={text}>
          Vous avez été invité à rejoindre{" "}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          . Acceptez l&apos;invitation pour créer votre compte.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Accepter l&apos;invitation
        </Button>
        <Text style={footer}>
          Si cette invitation ne vous concerne pas, ignorez simplement ce message.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default InviteEmail;
