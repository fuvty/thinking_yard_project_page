// Keep native values/change events; enhance only supported browsers, only on opt-in.
(() => {
  if (!('showPopover' in HTMLElement.prototype)) return;
  const chevron='<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m5 6.5 3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const check='<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8 3 3 7-7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  document.querySelectorAll('select[data-picker]').forEach(select => {
    const wrapper=document.createElement('span');wrapper.className='sp-picker';
    const trigger=document.createElement('button');trigger.type='button';trigger.className='sp-picker-trigger';
    trigger.id=`${select.id}-trigger`;trigger.setAttribute('role','combobox');trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');
    const value=document.createElement('span');trigger.append(value);trigger.insertAdjacentHTML('beforeend',chevron);
    const menu=document.createElement('div');menu.className='sp-picker-menu';menu.id=`${select.id}-options`;menu.setAttribute('popover','auto');menu.setAttribute('role','listbox');
    // Include the trigger in the popover's light-dismiss boundary.
    trigger.popoverTargetElement=menu;
    trigger.setAttribute('aria-controls',menu.id);
    const labels=Array.from(select.labels);
    labels.forEach((label,index)=>{label.id ||= `${select.id}-label-${index}`;label.htmlFor=trigger.id;});
    const labelIds=labels.map(label=>label.id).join(' ');
    if(labelIds){trigger.setAttribute('aria-labelledby',labelIds);menu.setAttribute('aria-labelledby',labelIds);}
    else {trigger.setAttribute('aria-label',select.getAttribute('aria-label')||'Select');menu.setAttribute('aria-label',trigger.getAttribute('aria-label'));}
    select.after(wrapper);wrapper.append(trigger,menu);select.hidden=true;
    let items=[],active=-1,query='',lastKey=0;
    const isOpen=()=>menu.matches(':popover-open');
    const setActive=index=>{
      active=index;items.forEach((item,i)=>item.toggleAttribute('data-active',i===index));
      if(items[index]){trigger.setAttribute('aria-activedescendant',items[index].id);items[index].scrollIntoView({block:'nearest'});}
    };
    const close=()=>{if(isOpen())menu.hidePopover();};
    const refresh=()=>{
      value.textContent=select.selectedOptions[0]?.textContent||'';trigger.disabled=select.disabled;
      menu.replaceChildren();items=Array.from(select.options,(option,index)=>{
        const item=document.createElement('div');item.className='sp-picker-option';item.id=`${menu.id}-${index}`;
        item.setAttribute('role','option');item.setAttribute('aria-selected',String(option.selected));item.setAttribute('aria-disabled',String(option.disabled));
        const text=document.createElement('span');text.textContent=option.textContent;item.append(text);item.insertAdjacentHTML('beforeend',check);
        item.addEventListener('pointermove',()=>{if(!option.disabled)setActive(index);});
        item.addEventListener('mousedown',event=>event.preventDefault());
        item.addEventListener('click',()=>choose(index));menu.append(item);return item;
      });
      if(select.disabled)close();
    };
    const choose=index=>{
      if(index<0||select.options[index].disabled)return;
      select.selectedIndex=index;select.dispatchEvent(new Event('input',{bubbles:true}));select.dispatchEvent(new Event('change',{bubbles:true}));close();trigger.focus({preventScroll:true});
    };
    const open=()=>{
      if(trigger.disabled||isOpen())return;
      menu.showPopover();
      const rect=trigger.getBoundingClientRect();const width=Math.min(Math.max(rect.width,220),innerWidth-24);
      menu.style.width=`${width}px`;menu.style.maxHeight=`${Math.min(280,innerHeight-24)}px`;
      const height=menu.getBoundingClientRect().height;
      menu.style.left=`${Math.max(12,Math.min(rect.left,innerWidth-width-12))}px`;
      menu.style.top=`${Math.max(12,Math.min(rect.bottom+6+height<=innerHeight-12?rect.bottom+6:rect.top-height-6,innerHeight-height-12))}px`;
      trigger.setAttribute('aria-expanded','true');setActive(select.selectedIndex);
    };
    trigger.addEventListener('click',event=>{event.preventDefault();isOpen()?close():open();});
    trigger.addEventListener('keydown',event=>{
      const key=event.key;
      if(key==='Tab'||key==='Escape'){close();return;}
      if(['ArrowDown','ArrowUp','Home','End','Enter',' '].includes(key)){
        event.preventDefault();
        if(key==='Enter'||key===' '){if(isOpen())choose(active);else open();return;}
        const wasOpen=isOpen();open();const enabled=items.map((_,i)=>i).filter(i=>!select.options[i].disabled);
        if(!enabled.length)return;
        let position=enabled.indexOf(active);
        if(key==='Home')position=0;else if(key==='End')position=enabled.length-1;
        else if(wasOpen)position=Math.max(0,Math.min(enabled.length-1,position+(key==='ArrowDown'?1:-1)));
        setActive(enabled[Math.max(0,position)]);
      }else if(key.length===1&&!event.ctrlKey&&!event.metaKey&&!event.altKey){
        event.preventDefault();open();query=(Date.now()-lastKey<700?query:'')+key.toLocaleLowerCase();lastKey=Date.now();
        const index=Array.from(select.options).findIndex(option=>!option.disabled&&option.textContent.toLocaleLowerCase().startsWith(query));if(index>=0)setActive(index);
      }
    });
    menu.addEventListener('toggle',()=>{trigger.setAttribute('aria-expanded',String(isOpen()));if(!isOpen())trigger.removeAttribute('aria-activedescendant');});
    addEventListener('resize',close);addEventListener('scroll',event=>{if(!menu.contains(event.target))close();},true);
    select.addEventListener('change',refresh);
    new MutationObserver(refresh).observe(select,{attributes:true,childList:true,subtree:true,characterData:true});
    refresh();
  });
})();
