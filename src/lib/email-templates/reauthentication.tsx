import * as React from "react";

import { Body, Container, Head, Heading, Html, Preview, Text } from "@react-email/components";

import { main, container, marque, h1, text, code, footer } from "./styles";

interface ReauthenticationEmailProps {
  token: string;
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre code de vérification</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={marque}>Formlist</Text>
        <Heading style={h1}>Votre code de vérification</Heading>
        <Text style={text}>Saisissez ce code pour confirmer votre identité :</Text>
        <Text style={code}>{token}</Text>
        <Text style={footer}>
          Ce code expire rapidement. Si vous n&apos;avez rien demandé, ignorez ce message et ne
          communiquez ce code à personne.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default ReauthenticationEmail;
