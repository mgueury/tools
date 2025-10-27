#!/bin/bash
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd $SCRIPT_DIR

export TF_VAR_genai_cohere_model="cohere.command-a-03-2025"
export TF_VAR_compartment_ocid="##TF_VAR_compartment_ocid##"
export TF_VAR_region="##TF_VAR_region##"
npm start | tee app_botsdk.log 2>&1 
