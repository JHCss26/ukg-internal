Import-Module WebAdministration

$siteName = "ukg-internal"
$path = "MACHINE/WEBROOT/APPHOST/$siteName"

# 1) Enable ARR proxy at the server level
Set-WebConfigurationProperty -pspath 'MACHINE/WEBROOT/APPHOST' `
  -filter "system.webServer/proxy" -name "enabled" -value "True"

# 2) Allow server variables (prevents 500.50 errors)
Add-WebConfigurationProperty -pspath $path `
  -filter "system.webServer/rewrite/allowedServerVariables" `
  -name "." -value @{name='HTTP_X_FORWARDED_PROTO'} -ErrorAction SilentlyContinue

Add-WebConfigurationProperty -pspath $path `
  -filter "system.webServer/rewrite/allowedServerVariables" `
  -name "." -value @{name='HTTP_X_FORWARDED_HOST'} -ErrorAction SilentlyContinue

# 3) Create /api reverse proxy rule
Add-WebConfiguration -pspath $path `
  -filter "system.webServer/rewrite/rules" `
  -value @{ name='ReverseProxyAPI'; stopProcessing='true' }

Set-WebConfigurationProperty -pspath $path `
  -filter "system.webServer/rewrite/rules/rule[@name='ReverseProxyAPI']/match" `
  -name "url" -value "^api/(.*)"

Set-WebConfigurationProperty -pspath $path `
  -filter "system.webServer/rewrite/rules/rule[@name='ReverseProxyAPI']/action" `
  -name "type" -value "Rewrite"

# Target your backend (adjust port if needed)
Set-WebConfigurationProperty -pspath $path `
  -filter "system.webServer/rewrite/rules/rule[@name='ReverseProxyAPI']/action" `
  -name "url" -value "http://localhost:9090/{R:1}"

# Forwarded headers
Add-WebConfiguration -pspath $path `
  -filter "system.webServer/rewrite/rules/rule[@name='ReverseProxyAPI']/serverVariables" `
  -value @{ name='HTTP_X_FORWARDED_PROTO'; value='https' } -ErrorAction SilentlyContinue

Add-WebConfiguration -pspath $path `
  -filter "system.webServer/rewrite/rules/rule[@name='ReverseProxyAPI']/serverVariables" `
  -value @{ name='HTTP_X_FORWARDED_HOST'; value='{HTTP_HOST}' } -ErrorAction SilentlyContinue

# Preserve host header on this site
Set-WebConfigurationProperty -pspath $path `
  -filter "system.webServer/proxy" -name "preserveHostHeader" -value "True"

# (Optional) Swagger: redirect /api/v1/docs -> /api/v1/docs/
Add-WebConfiguration -pspath $path `
  -filter "system.webServer/rewrite/rules" `
  -value @{ name='SwaggerTrailingSlash'; stopProcessing='true' }

Set-WebConfigurationProperty -pspath $path `
  -filter "system.webServer/rewrite/rules/rule[@name='SwaggerTrailingSlash']/match" `
  -name "url" -value "^api/v1/docs$"

Set-WebConfigurationProperty -pspath $path `
  -filter "system.webServer/rewrite/rules/rule[@name='SwaggerTrailingSlash']/action" `
  -name "type" -value "Redirect"

Set-WebConfigurationProperty -pspath $path `
  -filter "system.webServer/rewrite/rules/rule[@name='SwaggerTrailingSlash']/action" `
  -name "url" -value "/api/v1/docs/"

Set-WebConfigurationProperty -pspath $path `
  -filter "system.webServer/rewrite/rules/rule[@name='SwaggerTrailingSlash']/action" `
  -name "redirectType" -value "Permanent"

# Apply changes
iisreset
