from flask import Blueprint, current_app, send_from_directory, render_template_string
import os

docs_bp = Blueprint('docs', __name__)


@docs_bp.route('/openapi.yaml', methods=['GET'])
def openapi_yaml():
    # Serve the openapi YAML file from the docs folder
    docs_folder = os.path.join(current_app.root_path, '..', 'docs')
    # normalize path
    docs_folder = os.path.normpath(os.path.abspath(docs_folder))
    filename = 'openapi.yaml'
    return send_from_directory(docs_folder, filename)


@docs_bp.route('/swagger', methods=['GET'])
def swagger_ui():
    # Minimal HTML that loads Swagger UI from CDN and points to /openapi.yaml
    html = """
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Swagger UI</title>
        <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css" />
      </head>
      <body>
        <div id="swagger-ui"></div>
        <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
        <script>
          window.onload = function() {
            SwaggerUIBundle({
              url: '/openapi.yaml',
              dom_id: '#swagger-ui',
              presets: [SwaggerUIBundle.presets.apis],
              layout: 'BaseLayout'
            });
          };
        </script>
      </body>
    </html>
    """
    return render_template_string(html)
