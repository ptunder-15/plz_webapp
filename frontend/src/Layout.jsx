function Layout({ children }) {
  return (
    <div
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #f2f4f7 0%, #eef2f6 100%)",
        padding: "28px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: "1800px",
          margin: "0 auto",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default Layout;