#!/bin/bash
# Environment Variables
export TF_VAR_prefix="tools"

export TF_VAR_ui_type="html"
export TF_VAR_db_type="none"
export TF_VAR_license_model="LICENSE_INCLUDED"
export TF_VAR_deploy_type="public_compute"
export TF_VAR_language="python"

export TF_VAR_compartment_ocid="__TO_FILL__"

if [ -f $HOME/.oci_starter_profile ]; then
  . $HOME/.oci_starter_profile
fi

# Creation Details
export OCI_STARTER_CREATION_DATE=2025-03-06-08-21-55-092975
export OCI_STARTER_VERSION=3.4
export OCI_STARTER_PARAMS="prefix,java_framework,java_vm,java_version,ui_type,db_type,license_model,mode,infra_as_code,db_password,oke_type,security,deploy_type,language"

