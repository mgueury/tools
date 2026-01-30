# Build_common.sh
#!/usr/bin/env bash
if [[ -z "${BIN_DIR}" ]]; then
  echo "Error: BIN_DIR not set"
  exit 1
fi
if [[ -z "${PROJECT_DIR}" ]]; then
  echo "Error: PROJECT_DIR not set"
  exit 1
fi

APP_DIR=`echo ${SCRIPT_DIR} |sed -E "s#(.*)/(.*)#\2#"`
cd $SCRIPT_DIR

if [ "$TF_VAR_app_src_dir" != "" ]; then
  export APP_SRC_DIR=${PROJECT_DIR}/${TF_VAR_app_src_dir}
  if [ !-f $TF_VAR_app_dir/start.sh ]; then
     error_exit "File $TF_VAR_app_dir/start.sh is missing"
  fi

  if [ !-f $TF_VAR_app_dir/start.sh ]; then
     error_exit "File $TF_VAR_app_dir/install.sh is missing"
  fi
else 
  export APP_SRC_DIR=src
fi

if [ -z "$TF_VAR_deploy_type" ]; then
  . $PROJECT_DIR/starter.sh env
else 
  . $BIN_DIR/shared_bash_function.sh
fi 
