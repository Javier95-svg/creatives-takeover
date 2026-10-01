/** Real user actions plus an independent database observation; a success label alone never passes. */
export async function checkCustomerWorkflow({page,starter,accounts,readRows,writeConfirmed,assertions,errors,timeout=15000}){
  page.setDefaultTimeout(timeout);
  await page.goto('http://ct-app.test/');
  const marker='ct-test-'+crypto.randomUUID(),email=marker+'@example.invalid';
  const login=async account=>{
    await page.getByTestId('ct-login-email').fill(account.email);
    await page.getByTestId('ct-login-password').fill(account.password);
    await page.getByTestId('ct-login-submit').click();
  };
  if(starter==='customer_portal')await login(accounts.customer);
  else await page.getByTestId('ct-email').fill(email);
  if(starter!=='lead_capture')await page.getByTestId('ct-body').fill(marker);
  await page.getByTestId('ct-submit').click();
  await page.getByTestId('ct-success').waitFor({state:'visible'});
  if(starter!=='customer_portal')await login(accounts.owner);
  const text=starter==='lead_capture'?email:marker;
  const record=page.getByTestId('ct-record').filter({hasText:text});
  await record.waitFor({state:'visible'});
  if(starter==='request_management'){
    await record.getByTestId('ct-status').selectOption('done');
    await record.getByTestId('ct-save-status').click();
  }
  assertions.customer_task=true;
  const account=starter==='customer_portal'?accounts.customer:accounts.owner;
  const deadline=Date.now()+timeout;
  let rows=[];
  while(Date.now()<deadline){
    rows=await readRows(account.token,starter==='lead_capture'?'email':'body',text);
    if(writeConfirmed() && rows.length===1 && (starter!=='request_management' || rows[0].status==='done'))break;
    await new Promise(resolve=>setTimeout(resolve,50));
  }
  if(!writeConfirmed() || rows.length!==1)throw new Error('No confirmed database record for the completed task');
  if(starter==='request_management' && rows[0].status!=='done')throw new Error('Status change was not saved');
  assertions.database_write=true;
  await page.reload();await record.waitFor({state:'visible'});
  if(starter==='request_management' && await record.getByTestId('ct-status').inputValue()!=='done')throw new Error('Status did not survive reload');
  assertions.persisted_after_reload=true;
  await page.setViewportSize({width:390,height:844});
  await record.waitFor({state:'visible'});
  if(!await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))throw new Error('The customer record overflows a mobile screen');
  assertions.responsive_ui=true;
  if((await readRows(accounts.other.token,starter==='lead_capture'?'email':'body',text)).length)throw new Error('Another customer can read private records');
  assertions.access_control=true;
  if(errors.length)throw new Error('The app raised a browser error while completing the workflow');
  assertions.no_runtime_errors=true;
}
