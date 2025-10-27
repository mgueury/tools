resource "oci_apigateway_deployment" "starter_apigw_deployment_botsdk" {
  compartment_id = local.lz_app_cmp_ocid
  display_name   = "${var.prefix}-apigw-dep-botsdk"
  gateway_id     = local.apigw_ocid
  path_prefix    = "/components"
  specification {
    routes {
      path    = "/{pathname*}"
      methods = [ "ANY" ]
      backend {
        type = "HTTP_BACKEND"
        url    = "http://${local.apigw_dest_private_ip}:3000/components/$${request.path[pathname]}"
      }
    }      
  }
  freeform_tags = local.api_tags
}  