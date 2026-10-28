export const metadata = {
  title: "Bot de reembolsos",
  description: "Registro de boletas de gastos por WhatsApp",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ fontFamily: "system-ui, sans-serif", maxWidth: 720, margin: "0 auto", padding: "40px 16px", lineHeight: 1.6, color: "#1a1a1a", background: "#fff" }}>
        {children}
      </body>
    </html>
  );
}
