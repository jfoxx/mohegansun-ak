export default function init(el) {
  const ul = document.createElement('ul');
  [...el.children].forEach((row) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = row.querySelector('a').href;
    while (row.firstElementChild) a.append(row.firstElementChild);
    [...a.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-card-image';
      else div.className = 'cards-card-body';
    });
    li.append(a);
    ul.append(li);
    el.append(ul);
  });
}
