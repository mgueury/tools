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


resource "oci_core_security_list" "starter_security_list_botsdk" {
  compartment_id = local.lz_network_cmp_ocid
  vcn_id         = oci_core_vcn.starter_vcn.id
  display_name   = "${var.prefix}-security-list"

  ingress_security_rules {
    protocol  = "6" // tcp
    source    = "0.0.0.0/0"
    stateless = false

    tcp_options {
      min = 3000
      max = 3000
    }
  }
  freeform_tags = local.freeform_tags
}