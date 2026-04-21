function Layout({ children }) {
  return (
    <div className="app-layout">
      <div className="app-container">
        {children}
      </div>
    </div>
  );
}

export default Layout;
