(function () {
  function createSpark(x, y) {
    var spark = document.createElement('span');
    spark.className = 'pixel-spark';
    spark.style.left = x + 'px';
    spark.style.top = y + 'px';
    document.body.appendChild(spark);

    window.setTimeout(function () {
      spark.remove();
    }, 700);
  }

  document.addEventListener('click', function (event) {
    if (event.button !== 0) return;
    createSpark(event.clientX, event.clientY);
  }, { passive: true });
}());
