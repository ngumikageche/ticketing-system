import 'bootstrap/dist/css/bootstrap.min.css';
import React from 'react';
// import logo from './logo.svg'; // Ensure the path is correct

function App() {
  return (
    <div className="App">
      <nav className="navbar navbar-expand-lg bg-body-tertiary">
        <div className="container-fluid">
          <a className="navbar-brand" href="#">Navbar</a>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNavAltMarkup" aria-controls="navbarNavAltMarkup" aria-expanded="false" aria-label="Toggle navigation">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNavAltMarkup">
            <div className="navbar-nav">
              <a className="nav-link active " aria-current="page" href="#">Home</a>
              <a className="nav-link" href="#">Features</a>
              <a className="nav-link" href="#">Pricing</a>
              <a className="nav-link disabled" aria-disabled="true">Disabled</a>
            </div>
          </div>
        </div>
      </nav>

      

      <div className="container  mt-5">
        <h2 className="bg-pink">About Kamwana Ticketing System</h2>
        <p>In the dynamic landscape of modern business, efficient communication and issue resolution are paramount. Meet Kamwana ticketing system, your all-in-one solution for streamlined ticket management and customer support.</p>
        
        <h3 className="mt-4">tickets</h3>
        <table className="table">
          <thead >
            <tr className="bg-black">
              <th scope="col">#</th>
              <th scope="col">UserName</th>
              <th scope="col">Description</th>
              <th scope="col">status</th>
            </tr>
          </thead>
          <tbody>
            <tr className="table-active">
              <th scope="row">1</th>
              <td>Mark</td>
              <td>Otto</td>
              <td>@mdo</td>
            </tr>
            <tr>
              <th scope="row">2</th>
              <td>Jacob</td>
              <td>Thornton</td>
              <td>@fat</td>
            </tr>
            <tr>
              <th scope="row">3</th>
              <td colspan="2" className="table-active">Larry the Bird</td>
              <td>@twitter</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;
